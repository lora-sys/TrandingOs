# skill-sdk-spec.md

# Skill SDK Spec v4.1

## 1. Skill Manifest

```yaml
id: market.fetch_ohlcv
name: Fetch OHLCV
version: 1.0.0
category: market
source: builtin
verified: true
risk_level: low
permissions:
  - exchange.read
input_schema:
  type: object
output_schema:
  type: object
```

## 2. Skill Lifecycle

```txt
draft → testing → verified → deprecated
```

## 3. Skill SDK Example

```ts
export default defineSkill({
  id: "market.fetch_ohlcv",
  name: "Fetch OHLCV",
  permissions: ["exchange.read"],
  inputSchema,
  outputSchema,
  async execute(ctx, input) {
    ctx.events.emit("skill.progress", { message: "Fetching OHLCV" })
    const data = await ctx.tools.ccxt.fetchOHLCV(input)
    return { candles: data }
  }
})
```

## 4. Required Skill Categories

- market
- research
- browser
- indicator
- risk
- execution
- journal
- review
- evolution
- onchain
- airdrop
- artifact

## 5. Preinstalled Skills

### Market

- market.fetch_ticker
- market.fetch_ohlcv
- market.fetch_orderbook
- market.fetch_balance

### Research

- research.exa_search
- research.jina_read
- research.tavily_search

### Browser

- browser.open
- browser.extract
- browser.screenshot
- browser.pdf

### Risk

- risk.position_size
- risk.stop_loss
- risk.trade_permission
- risk.daily_loss_guard

### Execution

- execution.create_plan
- execution.paper_order
- execution.real_order_guarded
- execution.cancel_order

### Journal

- journal.log_trade
- journal.log_signal
- journal.log_emotion
- journal.attach_screenshot

### Airdrop

- airdrop.search_opportunities
- airdrop.check_eligibility
- airdrop.scam_check
- airdrop.create_step_guide

## 6. Permission Rules

Skills with these permissions require approval:

- exchange.real_trade
- api_key.write
- skill.install
- mcp.enable
- sandbox.export
