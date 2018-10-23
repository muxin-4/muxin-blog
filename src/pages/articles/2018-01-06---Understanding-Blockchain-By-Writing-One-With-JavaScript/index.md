---
title: Understanding Blockchain By Writing One With JavaScript
date: "2018-01-06"
layout: post
draft: false
path: "/posts/understanding-blockchain-by-writing-one-with-javascript"
category: "Exploring JavaScript"
tags:
  - "Blockchain"
  - "Crypto Currency"
description: "Blockchain technology is widely discussed in the tech community as well as in the mass media. The hype in the media makes blockchain seem like a cutting-edge technology that only trained experts are able to get a hang on. However, we don't need to be an expert to understand the core mechanism of blockchain. In this post, I'm going to demonstrate how blockchain works by writing a simple blockchain with vanilla JavaScript."
---

Blockchain technology is widely discussed in the tech community as well as in the mass media. The hype in the media makes blockchain seem like a cutting-edge technology that only trained experts are able to get a hang on. However, we don't need to be an expert to understand the core mechanism of blockchain. In this post, I'm going to demonstrate how blockchain works by writing a simple blockchain with vanilla JavaScript.

## What is a blockchain
**A blockchain is a decentralized database that records all transactions in a format that is checked and authenticated by participants.**

This is a definition as simple as I can think of. Let me dissect it into simpler ideas:
1. A blockchain is just a database.
2. It has no center.
3. It employs a mechanism that all participants (blocks) can check and authenticate all transactions.

To enable all the blocks to check and authenticate all transactions, we need to ensure:
1. A block has the complete transaction records of the whole blockchain.
2. All blocks should be immutable, so any attempts to modify a certain block will be observed.

Let's dive into code to implement these features.

We'll first create a bare bone block class.

```javascript
const SHA256 = require("crypto-js/sha256");
/*
   Since JavaScript doesn't have a built-in SHA256 function,
   we'll use a third party libaray.
*/

class Block {
  constructor(index, timestamp, data, previousHash = '') {
    this.index = index;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.data = data;
    this.hash = this.calculateHash();
  }

  calculateHash() {
      return SHA256(this.index
                        + this.previousHash
                        + this.timestamp
                        + JSON.stringify(this.data))
                    .toString();
  }
}
```

In the previous code, we specify that each block has the hash value of the previous block, which also contributes to calculating the hash value of current block. This design ensures that any changes to a block will trigger all the ensuing blocks to change.

Then, we build a blockchain class:

```javascript
    class Blockchain{
        constructor() {
            this.chain = [this.createGenesisBlock()];
        }

        createGenesisBlock() {
            return new Block(0, "05/01/2018", "Genesis Block", "0");
        }

        getLastBlock() {
            return this.chain[this.chain.length - 1];
        }

        addBlock(newBlock) {
            newBlock.previousHash = this.getLastBlock().hash;
            newBlock.hash = newBlock.calculateHash();
            this.chain.push(newBlock);
    }
}
```
The first block of a blockchain is called "Genesis Block". It can't be derived from previous block, so we hardcode it. To add a new block to the blockchain, we need to know the last block. And then we calculate the hash of the new block after we assign to it the previous hash.

Let's create our own crypto currency based on this blockchain!

```javascript
let FancyCoin = new Blockchain();

// Then we add blocks to it
FancyCoin.addBlock(new Block(1, "06/01/2018", {amount: 10}));
FancyCoin.addBlock(new Block(2, "06/01/2018", {amount: 15}));
```

The data is our transaction record. Let's suppose it tells how much money we have. Now, what if I'm a greedy guy and change my account balance? In code, I can do this:

```javascript
FancyCoin.chain[2].data = {amount: 1000}
```

Then I'll be super rich! Well, blockchain can prevent such rogue behavior. We can add a method to check if the blockchain has been tampered with:

```javascript
    isChainValid() {
        for (let i = 1; i < this.chain.length; i++){
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }

        return true;
    }
```

If we change the data of a block, the hash of that block would change. And since the next block depends on the hash of current block to calculate its own hash, it will be triggered to change its hash. The change will pass on, so the hash of ensuing blocks will all change! By comparing the hash values, we can find if a blockchain is valid.

## How to secure and scale a blockchain

Our blockchain is now working. We've implemented most of the core features of a blockchain, and we have a way to prevent invalid operations. There's still one huge issue remains to be solved, though.

If anyone can add new blocks to a blockchain instantly, the blockchain database will soon blow up... To solve this, we need to put a restriction on how fast a block can be added to the blockchain.

There's also a more important reason to put such restriction. Imagine that some one changes a block and calculates the hash values of all ensuing blocks, then we have no way to know the change! The `isChainValid()` check will still pass! So we must make calculating a valid hash difficult enough, so that no one has the computing power to calculate all the hash values after a certain block.

The process of finding a valid hash is called "mining". And since this is the way to prove that miners have calculated new blocks legally, it's also called "Proof Of Work". We can specify that a hash value that begins with certain amount of 0 is valid. Since the output of the hashing function can't be manipulated, one must go through a calculating process to find the valid hash, which, takes a great amount of computing power. The amount of 0 is called "difficulty". More 0 means more difficult.

In code, it would look like this:

```javascript
mineBlock(difficulty) {
    while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
        this.hash = this.calculateHash();
    }
  }
```

However, without changing the content of a block, the hash will never change. So our code will end up with an infinite while loop. To trigger change, we need to add something called nonce to the block.

```javascript
    class Block {
        constructor(index, timestamp, data, previousHash = '') {
        this.index = index;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.data = data;
        this.hash = this.calculateHash();
        this.nonce = 0;
  }

        calculateHash() {
            return SHA256(this.index
                            + this.previousHash
                            + this.timestamp
                            + JSON.stringify(this.data) + this.nonce)
                    .toString();
  }

        mineBlock(difficulty) {
            while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
                this.nonce++;
                this.hash = this.calculateHash();
            }
  }
}
```

Now, depending on the difficulty parameter, creating a new block will take a lot of computation and time. As the computer gets more and more powerful, the difficulty parameter is increased to slow down the mining process.

Check out the complete code [here](https://gist.github.com/leihuang69/4dcf21d3860ed260a9f5b8289ebc045b)

## Bonus
Here is an excellent video you can't miss! The interactive demo in the video is extremely helpful for me.

<iframe width="560" height="315" src="https://www.youtube.com/embed/_160oMzblY8?rel=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
