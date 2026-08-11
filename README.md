# Bindu — Water Passbook

A prototype laundry app that makes the water-saving cycle the default and credits customers for every litre they save.

Built as the Prototype stage of a design thinking project on reducing water consumption in laundromats (Group 7).

## The concept

Three ideas from our ideation, built into one interface:

1. **Default reversal.** Water Saver is pre-selected on every wash and resets to it each time. Standard is available, but it has to be chosen deliberately — and the interface states what that choice costs. This requires no new machines, only a settings change.
2. **Visibility.** Every wash reports the litres it used against what a standard cycle would have used, turning data the machine already records into something the customer can see.
3. **Water as currency.** The home screen is a passbook. Each wash is a transaction, water saved is credited, and credits accumulate into points redeemable at the counter. This carries over the "managing water like money" analogy from our ideation stage.

A traffic-light indicator assesses water need from load size, fabric and soil level, carried over from the staff-facing concept in SCAMPER 2.

## Files

| File | Description |
|---|---|
| `index.html` | Desktop layout — sidebar navigation, full statement view |
| `mobile.html` | Phone layout, shown in a device frame |

Both are self-contained. No build step, no dependencies, no framework. Open either file directly in a browser, or deploy the folder as a static site.

## Running locally

Double-click `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Notes on the numbers

Water figures are illustrative, calculated as `base litres × soil factor × fabric factor`, with the Water Saver cycle drawing roughly 72% of a standard fill. Base volumes are 30 / 45 / 60 L for small, medium and large loads. Points are credited at one per litre saved.
