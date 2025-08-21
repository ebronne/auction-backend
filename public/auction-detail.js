const auctionId = new URLSearchParams(window.location.search).get("id");
const token = localStorage.getItem("token");

const auctionInfoEl = document.getElementById("auctionInfo");
const countdownEl = document.getElementById("countdown");
const bidForm = document.getElementById("bidForm");
const bidAmountEl = document.getElementById("bidAmount");
const bidMessage = document.getElementById("bidMessage");
const bidHistoryEl = document.getElementById("bidHistory");

async function fetchAuctionDetails() {
  const res = await fetch(`/api/auctions/${auctionId}`);
  const data = await res.json();

  auctionInfoEl.innerHTML = `
    <h2 class="text-2xl font-bold mb-2">${data.title}</h2>
    <img src="${data.imageUrl}" alt="${data.title}" class="max-w-md rounded mb-4"/>
    <p>${data.description}</p>
    <p class="mt-2 font-semibold">Starting Price: GHS ${data.startingPrice.toFixed(2)}</p>
    <p class="text-green-600 font-bold">Current Highest Bid: GHS ${data.highestBid?.amount?.toFixed(2) || data.startingPrice}</p>
  `;

  startCountdown(new Date(data.endTime));
}

async function fetchBidHistory() {
  const res = await fetch(`/api/auctions/${auctionId}/bids`);
  const bids = await res.json();

  bidHistoryEl.innerHTML = bids.length
    ? bids.map(bid => `<li>GHS ${bid.amount.toFixed(2)} by ${bid.user?.name || "User"}</li>`).join("")
    : "<li>No bids yet.</li>";
}

bidForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const bidAmount = parseFloat(bidAmountEl.value);

  if (!token) {
    bidMessage.textContent = "Please log in to place a bid.";
    bidMessage.className = "text-red-500";
    return;
  }

  const res = await fetch(`/api/auctions/${auctionId}/bids`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ amount: bidAmount })
  });

  const result = await res.json();

  if (res.ok) {
    bidMessage.textContent = "Bid placed successfully!";
    bidMessage.className = "text-green-600";
    fetchBidHistory(); // refresh bid history
  } else {
    bidMessage.textContent = result.message || "Failed to place bid.";
    bidMessage.className = "text-red-500";
  }
});

// Countdown Timer
function startCountdown(endTime) {
  const interval = setInterval(() => {
    const now = new Date();
    const diff = endTime - now;

    if (diff <= 0) {
      countdownEl.textContent = "Auction ended";
      clearInterval(interval);
      bidForm.querySelector("button").disabled = true;
      return;
    }

    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const hours = Math.floor((diff / 1000 / 60 / 60) % 24);
    const days = Math.floor(diff / 1000 / 60 / 60 / 24);

    countdownEl.textContent = `${days}d ${hours}h ${minutes}m`;
  }, 1000);
}

// Initialize
fetchAuctionDetails();
fetchBidHistory();
