1. Build & publish (policy + registry + logger in one package is fine):

```
sui move build
sui client publish --gas-budget 100000000   # save the Package ID
```

Now your Seal client uses this Package ID when encrypting; `Walrus holds the ciphertext (get a Blob ID after walrus store ...). `

