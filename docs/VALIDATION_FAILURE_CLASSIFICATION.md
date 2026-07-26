# Failure Classification

Sprint 11B.3

Losing trades are tagged with one or more categories:

- Late Entry
- False Breakout
- Weak Trend
- Earnings Impact
- Macro Event
- Low Liquidity
- Tight Stop
- Aggressive Target
- High Volatility

Classification uses historical trade fields + nearby dataset events (earnings/macro) from the replay bundle. Every loser receives at least one tag.

Distribution is shown as share-of-tags plus a bar chart (analytics `BarChart`).
