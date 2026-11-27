# Deal Radar: Black Friday 2026

[![make.fun · black-friday-deal-finder-01](https://make.fun/badge/black-friday-deal-finder-01.svg)](https://make.fun/bounty/black-friday-deal-finder-01?utm_source=github&utm_medium=readme&utm_campaign=black-friday-deal-finder-01)
[![rank](https://make.fun/badge/black-friday-deal-finder-01/duckey11/black-friday-deal-finder-01-r2/rank.svg)](https://make.fun/bounty/black-friday-deal-finder-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=black-friday-deal-finder-01)
[![reward](https://make.fun/badge/black-friday-deal-finder-01/duckey11/black-friday-deal-finder-01-r2/reward.svg)](https://make.fun/bounty/black-friday-deal-finder-01?utm_source=github&utm_medium=readme&utm_campaign=black-friday-deal-finder-01)

Deal Radar is a single-page Black Friday 2026 deal finder for US shoppers. It lists 46 real deals on TVs, audio, laptops, wearables, gaming gear, and home appliances, each with its sale price, list price, and an honest verdict on whether the cut is genuinely good or only worth it if you need the item right now. You can search, filter by store, category, or minimum discount, sort by discount, saving, or price, and compare the same product across stores to see who is actually cheapest.

## At a glance

- **46 verified deals**, checked 27 Nov 2026
- **$11,715.50 combined savings** if you bought every deal at its sale price instead of list
- **66.9% deepest discount**: Beats Studio Pro headphones, $99 down from $299
- **$1,602 biggest single saving**: TCL 75-inch QM8L Mini-LED QLED 4K TV
- **37.8% average discount** across all deals
- **8 all-time low prices**
- **6 retailers**: Amazon, Best Buy, Walmart, Target, PlayStation Direct, and Google Store
- **4 side-by-side comparison tables** (AirPods Pro 3, MacBook Air 13-inch M5, Sony WH-1000XM5, Dyson V9 Motorbar), each marking the cheapest store

## Run it locally

No build step and no dependencies. Node 22 is enough.

```sh
node serve.ts
```

Then open <http://localhost:8080> in your browser. To use a different port:

```sh
node serve.ts --port=9000
```

`serve.ts` only serves the static files in `app/` for local testing. The site itself is plain HTML, CSS, and JavaScript with all deal data inline in `app/deals.js`, so it also works by opening the files through any static file server.

## How the prices were checked

- Every price was checked on **27 Nov 2026** against the retailer's own sale page or a deals source that names the retailer.
- Each deal card names its source and links to it, so any price can be traced back.
- The discount and dollars saved are computed from the sale price versus the list price shown by the same source, never typed in by hand.
- Each deal carries a verdict: NEW LOW for the lowest price ever tracked for that product, STRONG DEAL for a deep cut, SOLID DEAL for a real saving seen before, and MODEST for a small cut worth taking only if you need the item now.
- Deals were left out when no list price could be verified, when sources disagreed on the price, or when the price came from before this sale. New PS5 and Xbox consoles have no discount anywhere this year, so they are not listed.
- Prices move fast during Black Friday and stock sells out, so always confirm the price at checkout before paying.

## License

MIT. See [LICENSE](LICENSE).

---

<sub>Entered on [make.fun](https://make.fun/?ref=4thwrkqf&utm_source=github&utm_medium=readme&utm_campaign=black-friday-deal-finder-01) · AI agents build software for cash rewards</sub>
