import discord
from discord import app_commands
from discord.ext import tasks
import os
import sys
import cloudscraper
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from datetime import datetime, timedelta
import re
import subprocess
import json  # For saving and loading subscriptions

load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
GOOGLE_DRIVE_TXT_URL = "https://drive.google.com/uc?export=download&id=1C-yV7YbYY3KUJ-x6XD5oENL8qrw6thAE"
COMICK_NEW_RELEASES_URL = "https://comick.io/home2#view=\"new\""

notify_me = {}
notify_all = set()
notify_roles = {}
last_seen_titles = set()

# Load subscription data from JSON file (persistent storage)
subscriptions_file = "subscriptions.json"
if os.path.isfile(subscriptions_file):
    try:
        with open(subscriptions_file, "r") as f:
            data = json.load(f)
            # Parse loaded subscriptions data
            if isinstance(data, dict) and ("notify_all" in data or "notify_roles" in data or "notify_me" in data):
                # New format with separate keys
                if "notify_me" in data and isinstance(data["notify_me"], dict):
                    for user_id_str, series_list in data["notify_me"].items():
                        notify_me[int(user_id_str)] = set(series_list)
                if "notify_all" in data and isinstance(data["notify_all"], list):
                    notify_all.update(data["notify_all"])
                if "notify_roles" in data and isinstance(data["notify_roles"], dict):
                    for series, roles in data["notify_roles"].items():
                        # Ensure roles list is unique and list type
                        notify_roles[series] = list(set(roles)) if isinstance(roles, list) else []
            else:
                # Old format: entire file is user subscriptions
                if isinstance(data, dict):
                    for user_id_str, series_list in data.items():
                        notify_me[int(user_id_str)] = set(series_list)
    except Exception as e:
        print(f"Failed to load subscriptions: {e}")

def save_subscriptions():
    # Save current subscriptions to JSON file (persistent)
    try:
        with open(subscriptions_file, "w") as f:
            json.dump({"notify_me": {str(uid): list(series) for uid, series in notify_me.items()}, "notify_all": list(notify_all), "notify_roles": {series: roles for series, roles in notify_roles.items()}}, f, indent=4)
    except Exception as e:
        print(f"Failed to save subscriptions: {e}")

COOLDOWN_MINUTES = 10

intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True
intents.members = True
client = discord.Client(intents=intents)
tree = app_commands.CommandTree(client)

def is_admin(member):
    return member.guild_permissions.administrator

async def fetch_series_list():
    try:
        r = cloudscraper.create_scraper().get(GOOGLE_DRIVE_TXT_URL)
        if r.status_code == 200:
            lines = [line.strip() for line in r.text.splitlines() if line.strip()]
            return lines
        return []
    except Exception as e:
        print(f"Failed to fetch list: {e}")
        return []

def normalize(text):
    return re.sub(r"\s+", " ", text.strip().lower())

@tasks.loop(minutes=1)
async def fetch_comics():
    await client.wait_until_ready()
    try:
        scraper = cloudscraper.create_scraper()
        response = scraper.get(COMICK_NEW_RELEASES_URL)
        if response.status_code != 200:
            print(f"Failed to fetch comics: HTTP {response.status_code}")
            return

        soup = BeautifulSoup(response.text, "html.parser")
        update_cards = []
        updates_section = soup.find("h2", string=re.compile("Updates", re.IGNORECASE))
        if updates_section:
            container = updates_section.find_next("div")
            if container:
                update_cards = container.find_all("a", href=True)
        # Fallback if no update cards found
        if not update_cards:
            for card in soup.find_all("a", href=True):
                title_tag = card.find("p", class_="series-title")
                chapter_tag = card.find("p", class_="series-chapter")
                time_tag = card.find("time")
                if title_tag and chapter_tag and time_tag:
                    update_cards.append(card)

        now = datetime.utcnow()
        new_titles = []

        for card in update_cards:
            title_tag = card.find("p", class_="series-title")
            chapter_tag = card.find("p", class_="series-chapter")
            time_tag = card.find("time")

            if not (title_tag and chapter_tag and time_tag):
                continue

            title = title_tag.text.strip()
            chapter = chapter_tag.text.strip()
            timestamp = time_tag.get("datetime")

            try:
                uploaded_time = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            except:
                continue
            # Convert to naive datetime
            uploaded_time = uploaded_time.replace(tzinfo=None)

            if now - uploaded_time > timedelta(minutes=COOLDOWN_MINUTES):
                continue

            key = f"{title}|{chapter}"
            if key in last_seen_titles:
                continue

            last_seen_titles.add(key)
            new_titles.append((title, chapter, uploaded_time.strftime("%H:%M UTC")))

        for guild in client.guilds:
            for title, chapter, time_str in new_titles:
                notify_text = f"📚 **{title}** — {chapter} *(Uploaded: {time_str})*"

                # Notify users subscribed to this title
                for member in guild.members:
                    if title in notify_me.get(member.id, set()):
                        try:
                            await member.send(notify_text)
                        except:
                            pass

                # Notify @everyone if enabled for this title
                if title in notify_all:
                    for channel in guild.text_channels:
                        try:
                            await channel.send(f"@everyone\n{notify_text}")
                            break
                        except:
                            continue

                # Notify specific roles if enabled for this title
                if title in notify_roles:
                    for role_name in notify_roles[title]:
                        role = discord.utils.get(guild.roles, name=role_name)
                        if role:
                            for channel in guild.text_channels:
                                try:
                                    await channel.send(f"{role.mention}\n{notify_text}")
                                    break
                                except:
                                    continue
    except Exception as e:
        print(f"Error fetching comics: {e}")

@client.event
async def on_ready():
    await tree.sync()
    fetch_comics.start()
    print(f"{client.user} is online and slash commands are synced.")

# ─── SLASH COMMANDS ─────────────────────────────────────────────

@tree.command(name="notifyme", description="Subscribe to notifications for a specific series")
async def notifyme(interaction: discord.Interaction):
    series_list = await fetch_series_list()
    if not series_list:
        await interaction.response.send_message("❌ No series available to subscribe.", ephemeral=True)
        return

    # Limit options to 25 (Discord's max) and sort the series list
    display_series = sorted(series_list)
    if len(display_series) > 25:
        display_series = display_series[:25]
        prompt = "Please choose a series to subscribe (showing first 25)."
    else:
        prompt = "Please choose a series to subscribe:"
    options = [discord.SelectOption(label=s, value=s) for s in display_series]

    class SeriesSelect(discord.ui.Select):
        def __init__(self):
            super().__init__(placeholder="Select a series...", min_values=1, max_values=1, options=options)
        async def callback(self, select_interaction: discord.Interaction):
            selected_series = self.values[0]
            user_series = notify_me.setdefault(select_interaction.user.id, set())
            if selected_series in user_series:
                await select_interaction.response.edit_message(content=f"⚠️ You are already subscribed to **{selected_series}**.", view=None)
            else:
                user_series.add(selected_series)
                save_subscriptions()  # Save updated subscriptions to file
                await select_interaction.response.edit_message(content=f"✅ Subscribed to **{selected_series}**.", view=None)

    view = discord.ui.View()
    view.add_item(SeriesSelect())
    await interaction.response.send_message(prompt, view=view, ephemeral=True)

@tree.command(name="help", description="Interactive help menu")
async def help(interaction: discord.Interaction):
    # Create dropdown for help categories
    class CommandDropdown(discord.ui.Select):
        def __init__(self):
            options = [
                discord.SelectOption(emoji="🔔", label="Subscribe", value="subscribe", description="/notifyme"),
                discord.SelectOption(emoji="🚫", label="Unsubscribe", value="unsubscribe", description="/removeseries [series]"),
                discord.SelectOption(emoji="📃", label="My Series", value="myseries", description="List your subscriptions"),
                discord.SelectOption(emoji="📄", label="Available Series", value="availableseries", description="All subscribable series"),
                discord.SelectOption(emoji="⚙️", label="Admin Commands", value="admin", description="Admin-only commands"),
            ]
            super().__init__(placeholder="Select a help category...", options=options, min_values=1, max_values=1)
        async def callback(self, interaction_select: discord.Interaction):
            choice = self.values[0]
            if choice == "subscribe":
                await interaction_select.response.send_message("Use `/notifyme` to subscribe to a series via a dropdown selection.", ephemeral=True)
            elif choice == "unsubscribe":
                await interaction_select.response.send_message("Use `/removeseries [series]` to unsubscribe from a series, or `/unsubscribeall` to unsubscribe from all series.", ephemeral=True)
            elif choice == "myseries":
                await interaction_select.response.send_message("Use `/myseries` to list all series you've subscribed to.", ephemeral=True)
            elif choice == "availableseries":
                await interaction_select.response.send_message("Use `/availableseries` to view all series available for subscription.", ephemeral=True)
            elif choice == "admin":
                admin_cmds_msg = (
                    "Admin commands:\n"
                    "`/addnotifyall`\n"
                    "`/removenotifyall`\n"
                    "`/addnotifyrole`\n"
                    "`/removenotifyrole`\n"
                    "`/subscribemeall`\n"
                    "`/removeseriesfromuser`\n"
                    "`/restartbot`"
                )
                await interaction_select.response.send_message(admin_cmds_msg, ephemeral=True)

    view = discord.ui.View()
    view.add_item(CommandDropdown())

    # Build help embed with user and admin command lists
    embed = discord.Embed(title="📘 ChapterSniffer Help Menu", color=0x5865F2)
    embed.add_field(name="👤 User Commands", value=(
        "• `/help` - Show this help menu\n"
        "• `/notifyme` - Subscribe to a series\n"
        "• `/removeseries [series]` - Unsubscribe from a series\n"
        "• `/unsubscribeall` - Unsubscribe from all series\n"
        "• `/myseries` - List your subscribed series\n"
        "• `/availableseries` - Show all available series\n"
        "• `/othernotifications` - View global notifications summary"
    ), inline=False)
    embed.add_field(name="🛠️ Admin Commands", value=(
        "• `/addnotifyall [series]` - Notify @everyone for a series\n"
        "• `/removenotifyall [series]` - Stop notifying @everyone for a series\n"
        "• `/addnotifyrole [series] [role]` - Notify a role when a series updates\n"
        "• `/removenotifyrole [series] [role]` - Remove role notifications for a series\n"
        "• `/subscribemeall` - Subscribe yourself to all series\n"
        "• `/removeseriesfromuser [user]` - Remove a series from a user's subscriptions\n"
        "• `/restartbot` - Restart the bot"
    ), inline=False)
    embed.set_footer(text="Use the dropdown below to view command usage details.")
    await interaction.response.send_message(embed=embed, view=view, ephemeral=True)

@tree.command(name="removeseries", description="Unsubscribe from a specific series")
@app_commands.describe(series="Exact name of the series")
async def removeseries(interaction: discord.Interaction, series: str):
    user_series = notify_me.get(interaction.user.id, set())
    if series in user_series:
        user_series.remove(series)
        save_subscriptions()  # Save updated subscriptions to file
        await interaction.response.send_message(f"✅ Removed **{series}** from your list.", ephemeral=True)
    else:
        await interaction.response.send_message("You were not subscribed to this series.", ephemeral=True)

# New command to unsubscribe user from all series at once
@tree.command(name="unsubscribeall", description="Unsubscribe from all series")
async def unsubscribeall(interaction: discord.Interaction):
    user_series = notify_me.get(interaction.user.id, set())
    if not user_series:
        await interaction.response.send_message("You are not subscribed to any series.", ephemeral=True)
    else:
        user_series.clear()
        save_subscriptions()  # Persist the updated subscription list
        await interaction.response.send_message("✅ Removed all series from your list.", ephemeral=True)

@tree.command(name="myseries", description="See all series you're subscribed to")
async def myseries(interaction: discord.Interaction):
    user_series = notify_me.get(interaction.user.id, set())
    if not user_series:
        await interaction.response.send_message("You are not subscribed to any series.", ephemeral=True)
    else:
        embed = discord.Embed(title="📃 Your Subscribed Series", description="\n".join(f"- {s}" for s in sorted(user_series)), color=0x33ccff)
        await interaction.response.send_message(embed=embed, ephemeral=True)

@tree.command(name="availableseries", description="List all series available to subscribe")
async def availableseries(interaction: discord.Interaction):
    series_list = await fetch_series_list()
    if not series_list:
        await interaction.response.send_message("❌ No series available.", ephemeral=True)
        return
    embed = discord.Embed(title="📄 Available Series", color=0x2ecc71)
    chunk = ""
    for s in sorted(series_list):
        line = f"• {s}\n"
        if len(chunk) + len(line) > 1024:
            embed.add_field(name="\u200b", value=chunk, inline=False)
            chunk = ""
        chunk += line
    if chunk:
        embed.add_field(name="\u200b", value=chunk, inline=False)
    await interaction.response.send_message(embed=embed, ephemeral=True)

@tree.command(name="addnotifyall", description="(Admin) Notify @everyone for a series")
@app_commands.describe(series="Series to ping @everyone for")
async def addnotifyall(interaction: discord.Interaction, series: str):
    if not is_admin(interaction.user):
        await interaction.response.send_message("You must be an admin to use this.", ephemeral=True)
        return
    notify_all.add(series)
    save_subscriptions()
    await interaction.response.send_message(f"✅ Now notifying @everyone for **{series}**.", ephemeral=True)

@tree.command(name="removenotifyall", description="(Admin) Stop @everyone notifications for a series")
@app_commands.describe(series="Series to stop notifying @everyone")
async def removenotifyall(interaction: discord.Interaction, series: str):
    if not is_admin(interaction.user):
        await interaction.response.send_message("You must be an admin to use this.", ephemeral=True)
        return
    if series in notify_all:
        notify_all.discard(series)
        save_subscriptions()
        await interaction.response.send_message(f"✅ Removed @everyone for **{series}**.", ephemeral=True)
    else:
        await interaction.response.send_message("❌ That series was not set to notify @everyone.", ephemeral=True)

@tree.command(name="addnotifyrole", description="(Admin) Notify a role for a series")
@app_commands.describe(series="Series to notify", role="Role name to ping")
async def addnotifyrole(interaction: discord.Interaction, series: str, role: str):
    if not is_admin(interaction.user):
        await interaction.response.send_message("You must be an admin to use this.", ephemeral=True)
        return
    roles_list = notify_roles.setdefault(series, [])
    if role not in roles_list:
        roles_list.append(role)
        save_subscriptions()
        await interaction.response.send_message(f"✅ Added role `{role}` for **{series}** notifications.", ephemeral=True)
    else:
        await interaction.response.send_message(f"⚠️ Role `{role}` is already receiving notifications for **{series}**.", ephemeral=True)

@tree.command(name="removenotifyrole", description="(Admin) Remove a role from notifications")
@app_commands.describe(series="Series", role="Role to remove")
async def removenotifyrole(interaction: discord.Interaction, series: str, role: str):
    if not is_admin(interaction.user):
        await interaction.response.send_message("You must be an admin to use this.", ephemeral=True)
        return
    roles_list = notify_roles.get(series, [])
    if role in roles_list:
        while role in roles_list:
            roles_list.remove(role)
        if not roles_list:
            del notify_roles[series]
        save_subscriptions()
        await interaction.response.send_message(f"✅ Removed role `{role}` from **{series}**.", ephemeral=True)
    else:
        await interaction.response.send_message("❌ That role was not being notified for this series.", ephemeral=True)

@tree.command(name="othernotifications", description="Show public notification setup")
async def othernotifications(interaction: discord.Interaction):
    desc = []
    if notify_all:
        desc.append("**@everyone:**\n" + "\n".join(f"- {s}" for s in sorted(notify_all)))
    filtered_roles = {k: v for k, v in notify_roles.items() if v}
    if filtered_roles:
        desc.append("**Role-based:**")
        for s, roles in filtered_roles.items():
            desc.append(f"- {s} → {', '.join(roles)}")
    if not desc:
        await interaction.response.send_message("There are no public notifications set.", ephemeral=True)
    else:
        embed = discord.Embed(title="📢 Notification Summary", description="\n".join(desc), color=0xf1c40f)
        await interaction.response.send_message(embed=embed, ephemeral=True)

@tree.command(name="subscribemeall", description="(Admin) Subscribe yourself to all current series")
async def subscribemeall(interaction: discord.Interaction):
    if not is_admin(interaction.user):
        await interaction.response.send_message("❌ You must be an admin to use this command.", ephemeral=True)
        return

    series_list = await fetch_series_list()
    user_series = notify_me.setdefault(interaction.user.id, set())
    added = 0
    for series in series_list:
        if series not in user_series:
            user_series.add(series)
            added += 1

    if added > 0:
        save_subscriptions()  # Save subscription updates to file

    embed = discord.Embed(
        title="📥 Bulk Subscription",
        description=f"You have been subscribed to **{added}** new series.",
        color=0x3498db
    )
    await interaction.response.send_message(embed=embed, ephemeral=True)

@tree.command(name="removeseriesfromuser", description="(Admin) Remove a series from a user's subscriptions")
@app_commands.describe(user="User to modify")
async def removeseriesfromuser(interaction: discord.Interaction, user: discord.User):
    if not is_admin(interaction.user):
        await interaction.response.send_message("You must be an admin to use this.", ephemeral=True)
        return
    user_series = notify_me.get(user.id, set())
    user_display = user.mention if interaction.guild and interaction.guild.get_member(user.id) else str(user)
    if not user_series:
        await interaction.response.send_message(f"❌ {user_display} is not subscribed to any series.", ephemeral=True)
        return
    series_list = sorted(user_series)
    if len(series_list) > 25:
        series_list = series_list[:25]
        prompt = f"Please choose a series to remove from {user_display}'s subscriptions (showing first 25)."
    else:
        prompt = f"Please choose a series to remove from {user_display}'s subscriptions:"
    options = [discord.SelectOption(label=s, value=s) for s in series_list]

    class RemoveSeriesSelect(discord.ui.Select):
        def __init__(self):
            super().__init__(placeholder="Select a series...", min_values=1, max_values=1, options=options)
        async def callback(self, select_interaction: discord.Interaction):
            selected_series = self.values[0]
            user_series_inner = notify_me.get(user.id, set())
            if selected_series in user_series_inner:
                user_series_inner.remove(selected_series)
                save_subscriptions()
                await select_interaction.response.edit_message(content=f"✅ Removed **{selected_series}** from {user_display}'s subscriptions.", view=None)
            else:
                await select_interaction.response.edit_message(content=f"❌ {user_display} was not subscribed to **{selected_series}**.", view=None)

    view = discord.ui.View()
    view.add_item(RemoveSeriesSelect())
    await interaction.response.send_message(prompt, view=view, ephemeral=True)

@tree.command(name="restartbot", description="(Admin) Restarts the bot")
async def restartbot(interaction: discord.Interaction):
    if not is_admin(interaction.user):
        await interaction.response.send_message("❌ You must be an admin to restart the bot.", ephemeral=True)
        return

    await interaction.response.send_message("♻️ Restarting bot...", ephemeral=True)
    print(f"[INFO] Restart command invoked by {interaction.user} (ID: {interaction.user.id})")
    # Attempt external restart script for development; in production, use a process manager for restarts
    try:
        print("[INFO] Launching restart script...")
        script_path = os.path.join(os.path.dirname(__file__), "restart.py")
        subprocess.Popen([sys.executable, script_path])
    except Exception as e:
        print(f"[ERROR] Failed to restart bot: {e}")
        await interaction.edit_original_response(content="⚠️ Restart failed.")
        return
    await client.close()

client.run(TOKEN)