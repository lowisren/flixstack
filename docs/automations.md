# Flixstack Automation Hub Workflows

Three ContentStack Automation Hub workflows demonstrate how to automate content operations at scale.

---

## 1. Auto-Tagging Pipeline

**Trigger:** Entry published (content types: `movie`, `tv_series`)

**Flow:**
```
ContentStack entry published
  → Automation Hub webhook fires
  → Call AI agent (e.g., Claude API or OpenAI)
  → Receive: SEO metadata + suggested genre tags
  → ContentStack Management API: update entry fields
  → Re-publish entry
```

**Webhook Payload (from ContentStack):**
```json
{
  "module": "entry",
  "event": "publish",
  "data": {
    "entry": {
      "uid": "blt1234",
      "content_type_uid": "movie",
      "title": "Inception",
      "synopsis": "A thief who steals corporate secrets…",
      "tags": []
    },
    "environment": "production"
  }
}
```

**Management API Update Payload:**
```json
{
  "entry": {
    "seo": {
      "meta_title": "Inception (2010) — Stream on Flixstack",
      "meta_description": "A mind-bending thriller about dream heisting. Watch now on Flixstack."
    },
    "tags": ["thriller", "sci-fi", "heist", "christopher-nolan"]
  }
}
```

**Automation Hub Configuration:**
1. New Automation → Name: "Auto-Tag on Publish"
2. Trigger: "Entry Published" → Content Type: `movie`, `tv_series`
3. Step 1: HTTP Request → POST your AI agent endpoint
4. Step 2: ContentStack → Update Entry (map response fields)
5. Step 3: ContentStack → Publish Entry

---

## 2. Availability Expiry Automation

**Trigger:** Scheduled (daily at 00:00 UTC)

**Flow:**
```
Daily cron fires
  → Query ContentStack for entries where availability_window.available_until < now
  → For each expired entry:
      → ContentStack Management API: Unpublish entry
      → Append entry UID to "expiring_soon" reference list on site_config
  → Optional: send Slack notification
```

**Query (Delivery API):**
```json
{
  "content_type": "movie",
  "query": {
    "availability_window.available_until": {
      "$lt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

**Unpublish Payload (Management API):**
```json
{
  "entries": [{ "uid": "blt1234", "locale": "en-us" }],
  "environments": ["production"]
}
```

**Automation Hub Configuration:**
1. New Automation → Name: "Availability Expiry"
2. Trigger: "Scheduled" → CRON: `0 0 * * *` (daily midnight UTC)
3. Step 1: ContentStack → Find Entries (filter by `available_until`)
4. Step 2: Loop → ContentStack Unpublish Entry
5. Step 3 (optional): Slack → Post message

---

## 3. New Episode Notifications

**Trigger:** Entry published (content type: `episode`)

**Flow:**
```
New episode entry published
  → Identify parent TV series
  → Query Lytics for users with series in watchlist
  → For each matching user segment:
      → Fire notification event to push service
  → Log notification count to ContentStack
```

**Webhook Payload:**
```json
{
  "module": "entry",
  "event": "publish",
  "data": {
    "entry": {
      "uid": "blt_ep_001",
      "content_type_uid": "episode",
      "title": "System",
      "episode_number": 1,
      "parent_series": { "uid": "blt_series_001", "title": "The Bear" }
    }
  }
}
```

**Lytics Entity Query:**
```bash
GET https://api.lytics.io/api/entity/user/_field/watchlist_series_uids/blt_series_001
Authorization: Bearer {LYTICS_API_KEY}
```

**Notification Event Payload:**
```json
{
  "user_id": "user_123",
  "event": "new_episode",
  "data": {
    "series_title": "The Bear",
    "episode_title": "System",
    "episode_number": 1,
    "watch_url": "https://flixstack.com/watch/the-bear"
  }
}
```

**Automation Hub Configuration:**
1. New Automation → Name: "New Episode Notification"
2. Trigger: "Entry Published" → Content Type: `episode`
3. Step 1: HTTP Request → Lytics Entity API (get watchlisted users)
4. Step 2: Loop over users → HTTP Request → Notification service
5. Step 3: ContentStack → Update `site_config` notification log
