# LinkedIn Feed Filter

A Chrome extension that filters your LinkedIn feed to show only posts matching your keywords. Focus on what matters to you - whether that's job opportunities, industry news, specific topics, or content from particular companies.

## Features

- **Keyword-Based Filtering**: Show only posts containing your specified keywords
- **Fully Customizable**: Define any keywords or phrases you want to see
- **Toggle On/Off**: Easily enable or disable filtering with one click
- **Post Counter**: See how many posts have been hidden
- **Real-time Updates**: Works with LinkedIn's infinite scroll and dynamic content

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked**
5. Select the folder containing this extension

## Usage

1. Navigate to [LinkedIn](https://www.linkedin.com)
2. Click the extension icon in your browser toolbar
3. Use the toggle to enable/disable filtering
4. Customize keywords to match the content you want to see

## Example Use Cases

- **Job Hunting**: Filter for "hiring", "job opening", "we're hiring", "#opentowork"
- **Industry News**: Filter for "AI", "machine learning", "startup", "funding"
- **Networking**: Filter for specific company names or people
- **Learning**: Filter for "tutorial", "tips", "how to", "lessons learned"

## Customizing Keywords

1. Click the extension icon
2. Edit the keywords in the text area (one keyword per line)
3. Click **Save Keywords**
4. Click **Reset to Default** to restore the original keywords

Keywords are case-insensitive, so "Hiring" and "hiring" will both match.

## How It Works

The extension uses a content script that:

1. Monitors the LinkedIn feed for new posts
2. Analyzes each post's text content for your keywords
3. Hides posts that don't match any keywords
4. Uses structural detection to identify posts (handles LinkedIn's dynamic CSS classes)

## Permissions

- **storage**: Save your keyword preferences and settings
- **activeTab**: Access the LinkedIn page to filter posts

## Files

```
├── manifest.json    # Extension configuration
├── content.js       # Main filtering logic
├── styles.css       # Styles for hiding posts
├── popup.html       # Extension popup UI
├── popup.js         # Popup functionality
├── popup.css        # Popup styles
└── icons/           # Extension icons
```

## License

MIT License
