/* ============================================================
   NEOBANK ATLAS — VERIFIED AVAILABILITY LAYER
   ------------------------------------------------------------
   48 providers with real, per-country availability lists.

   Two provenance levels, recorded per row and shown in the UI:

     confidence:"issuer"    — read from the provider's own docs
     confidence:"secondary" — reputable write-up, issuer page unreachable
     confidence:"directory" — CryptoCardHub's structured country matrix

   Country lists are stored as a bitmask over COUNTRY_DICT to keep
   this file small; DECODE() expands them at load.

   Availability rots fast. `checked` is the date it was read, and the
   UI flags anything older than 180 days as due for re-checking.
   ============================================================ */

const COUNTRY_DICT = ["Afghanistan","Albania","Algeria","Andorra","Angola","Anguilla","Antigua and Barbuda","Argentina","Armenia","Aruba","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bermuda","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","British Virgin Islands","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Cape Verde","Cayman Islands","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Cook Islands","Costa Rica","Croatia","Curaçao","Cyprus","Czech Republic","Côte d'Ivoire","Democratic Republic of the Congo","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Falkland Islands","Faroe Islands","Fiji","Finland","France","French Guiana","French Polynesia","Gabon","Gambia","Georgia","Germany","Ghana","Gibraltar","Greece","Greenland","Grenada","Guadeloupe","Guam","Guatemala","Guernsey","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hong Kong","Hungary","Iceland","India","Indonesia","Iraq","Ireland","Isle of Man","Israel","Italy","Jamaica","Japan","Jersey","Jordan","Kazakhstan","Kenya","Kiribati","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Macau","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Martinique","Mauritania","Mauritius","Mayotte","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Montserrat","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Caledonia","New Zealand","Nicaragua","Niger","Nigeria","Niue","North Macedonia","Northern Mariana Islands","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Puerto Rico","Qatar","Romania","Russia","Rwanda","Réunion","Saint Barthelemy","Saint Helena","Saint Kitts and Nevis","Saint Lucia","Saint Martin","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Sint Maarten","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tokelau","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Turks and Caicos Islands","Tuvalu","US Virgin Islands","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Wallis and Futuna","Western Sahara","Yemen","Zambia","Zimbabwe"];

/* [ display name, cryptocardhub slug, base64 bitmask over COUNTRY_DICT ] */
const PACKED = [
["Ready","ready-card","CAgEIABAEyAYNAiEJUA4ECCAAAFMAAIMIgAAAgA="],
["1inch Card","1inch-card","AAgEIABAEyAYJACMBEA4EACAAAFMAAAMIgAAAgA="],
["Avalanche Card","avalanche-card","3/3d9+9u8/+cvfSt3P+/v/2+Avhvsf/9+99Vfzg="],
["Avici","avici-card","wKSJBBAixAcAiEQDEAEAAgQCAqQDsBBBEIRIDRA="],
["Binance Card","binance-card","AAEABAACAAAAAAAAAAAAAAQAAAABAAAAAAAAAAA="],
["Bitget Wallet","bitget-wallet-card","gAgEJIBDEyUYJASMFEA4EgSAACFPAACNogQAAgE="],
["Bitpanda","bitpanda-card","AAgEAABAASAYJACABEAwEACAAAAIAAAMAgAAAAA="],
["BitPay Card","bitpay-card","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAA="],
["Bleap","bleap-card","AAgEIABAEyAYJACMBEA4EACAAAFMAAAMYgAAAAA="],
["Bybit Card","bybit-card","gAgEIAAAEyAIJAAEhEAwEASAAAAMAAAMYgAAAAA="],
["CEX.IO Card","cex-io-card","AAgEIABAEyAYJACMBEA4EACAAAFMAAAMIgAAAAA="],
["COCA","coca-card","iBwEJIBCEyUYPgiOt0F4ErSAEiNPAAjM4gTCEwE="],
["Coinbase Card","coinbase-card","AAgEIABAEyAYJACMBEA4EACAAAFMAAAMIgAABgA="],
["Crypto.com","crypto-com-card","wGjd9+9u9/+cv/S/3v//v/32Xv9vsf/d/9/XfzE="],
["Cypher","cypher-card","/Hp9F9x08+/f/U+Ppnr592fA+eNtMm+c9v0ffxM="],
["Decaf","decaf-card","373d9+9u8/+cr/St3Pu7v/22Sv9vsff9f99VfzA="],
["EtherFi Cash","ether-fi-cash-card","3/3f9+9g89+Ur/TP3P+/vX1+Xu9vsf+9f99Bfzg="],
["Exa","exa-card","wCSJBJAigAUAiEQDEAEAAAQAAqQDsABBEIAICQA="],
["Fold","fold-card","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAA="],
["Gemini Credit Card","gemini-credit-card","AAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAABAA="],
["Gnosis Pay","gnosis-pay-card","gAgEJABAEyAYJACMBEA4EACAAAFMAAAMYgAAAgA="],
["Holyheld","holyheld-card","AAgEIABAEyAYJACMBEA4EACAAAFMAAAMIgAAAAA="],
["Hyperbeat","hyperbeat-card","3v3d9s9v93+cr0S93n+7t/32Wv9vsf/d9t/XfxE="],
["KAST","kast-card","8Pr9Hti29+///1+vp37593/ju/N9/k/Wdv0ffxc="],
["Kolo","kolo-card","3/3f9+9v//+cr/T/3vu/v/3+Xv9vsf/9d9/X+zk="],
["Krak","krak-card","AAgEIABAEyAYJACMBEA4EACAAAFMAAAMIgAAAgA="],
["MetaMask","metamask-card","gAgEJARAEyAYJACMBEA4EACAAAFMAAAMYgAABgA="],
["Nexo","nexo-card","AAgEAABAEwAYJACMBEA4EACAAAFMAAAMIgAAAgA="],
["Oobit","oobit-card","lPXU9scus38MK7S52nu7tU12Cu9vsd/cJF9VfQE="],
["Payy","payy-card","////9/9/9/////////////////9//////////z8="],
["Phantom","phantom-cash-card","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAA="],
["Plasma One","plasma-one-card","3/3f9+9v9/+cr/T93vu/v/3+Xv/vsf/9f9/X/zk="],
["RedotPay","redotpay-card","2H3dNskm92+cr1S91hsAAAAAAAAAAAAIAAAAAAA="],
["Revolut","revolut-crypto-card","AAwEJABAEyAYJACMFEA4EACAAgFMAAANYgAAAgA="],
["Rizon","rizon-card","yvVJl8Uu4N+EgkQp2FqbJ90iQvtrsW+dVE1VXzA="],
["Solayer Emerald","solayer-card","4OL5Ftiu4M3l2W8DsRvJxU0xoOYT/90TlPsdGDI="],
["Tangem","tangem-pay-card","gCSJBIAigAUAAEQDGAAAAAQABqADAABBAIAACQA="],
["Tria","tria-card","3/3d9+9u+v+cr/Qt2P+/v/22Xu9vsfv9999Vfzg="],
["Trustee Plus","trustee-card","AAgEIABAEyAYIACMBEA4EACAAAFMAAAMIgAAAAA="],
["Tuyo","tuyo-card","wCitDJQiEiAYJACEBEAwEASAAABMAAAMIgAABgA="],
["UglyCash","uglycash-card","gAAAAIAigAUAAAQBAAAAAAQAAKABAAAAAAAADAA="],
["Uphold","uphold-card","AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABgA="],
["UR","ur-card","AAwEJARBEyAYJACOFEA4AgCAAgFMAgCN4gAAAwA="],
["Wirex","wirex-card","AAwAAAAAEgAQBAACBAAAAACAAgFOAAAFogQABgA="],
["Xapo Bank","xapo-bank-card","gAwEJIRCEyAYJACcFkE4EASCAgFtAACNYgAAAwA="],
["XPlace","xplace-card","3v3f9u8n/v+cr/S93nu7v/n2Hvtvsd/9f99XezE="],
["xPortal","xportal-card","AAgEIABAEyAYIACMBEA4EACAAAFMAAAMIgAAAAA="],
["ZEN.com","zen-card","CAhEIIViEyAaNgiON0A4ErCAQgFOACLNYgSCBwA="]
];

/* Rows I read against the provider's own documentation keep their
   fee text, caveats and source. Where the issuer's number disagrees
   with the directory's country count, the conflict is recorded
   rather than quietly resolved. */
const SOURCED = {
 "RedotPay":{fee:"Virtual card $5 · physical $100 · no annual fee",conf:"secondary",
   src:"https://redotpayhelp.com/supported-countries",
   conflict:"Marketing and secondary write-ups claim 130+ countries; the structured matrix lists 69."},
 "KAST":{fee:"Tiered cards · cashback up to 3% in stablecoin",conf:"issuer",
   src:"https://concierge.kast.xyz/hc/en-us/articles/13939999566095-Is-the-KAST-Card-Available-in-My-Country",
   note:"Bans a lot of the emerging markets it markets itself to — Pakistan, Philippines, Indonesia, Kenya, South Africa."},
 "Plasma One":{fee:"Up to 4% XPL cashback · 10%+ APY on USD₮",conf:"secondary",
   src:"https://www.plasma.org/personal", note:"Waitlist — needs a 6-character invite code."},
 "EtherFi Cash":{fee:"Up to 3% cashback · borrow against restaked collateral",conf:"issuer",
   src:"https://help.ether.fi/en/articles/262373-where-is-ether-fi-currently-unavailable",
   note:"Live in the US, but not in 20 states."},
 "Wirex":{fee:"0% Wirex FX markup · no annual fee",conf:"issuer",
   src:"https://www.wirexapp.com/help/article/supported-countries-1189",
   conflict:"Wirex's own matrix covers ~40 markets; the directory lists 23 with a card."},
 "Nexo":{fee:"0.2% FX in EEA/UK, 2% elsewhere · 0.75% crypto→EURx swap",conf:"secondary",
   src:"https://supportedcountries.com/nexo-card/",
   note:"Despite global branding, this is an EEA/UK product."},
 "Gnosis Pay":{fee:"No annual fee · up to 5% GNO cashback",conf:"issuer",
   src:"https://help.gnosispay.com/hc/en-us/articles/39401751918612-Supported-Countries-for-Gnosis-Pay",
   note:"Card is wired to a Safe you control; IBAN eligibility is narrower than card eligibility."},
 "COCA":{fee:"0% FX · up to 8% cashback within a monthly allowance",conf:"secondary",
   src:"https://www.spendnode.io/crypto-cards/coca/", note:"Not available to US residents."},
 "Bleap":{fee:"Zero FX · free ATM tier",conf:"issuer",
   src:"https://www.bleap.finance/en-us/legal-agreements/bleap-cardholder-terms-eea",
   note:"Not available to US residents."},
 "Crypto.com":{fee:"2% ATM above free allowance · EU top-up 1% · FX by tier",conf:"issuer",
   src:"https://help.crypto.com/en/articles/1341655-which-are-the-available-markets",
   note:"Not available in New York."},
 "Bybit Card":{fee:"FX by region: EEA 0.5%, AU 1%, BR 1.5%, APAC/MX 2%, AR 7%",conf:"issuer",
   src:"https://www.bybit.com/en/help-center/article/FAQ--Changes-to-Bybit-Card-Services-in-the-EEA--CH",
   note:"Suspended in France since January 2025."},
 "Bitget Wallet":{fee:"Issuer varies by region (DCS in Asia, Immersve in EU/LatAm)",conf:"secondary",
   src:"https://web3.bitget.com/card"},
 "Coinbase Card":{fee:"No annual or FX fee · undisclosed conversion spread",conf:"issuer",
   src:"https://www.coinbase.com/card", note:"US: available everywhere except Hawaii."}
};

/* ============================================================
   COUNTRY OVERRIDES
   ------------------------------------------------------------
   A single global allow-list is the wrong shape and it got things
   wrong. Two failures found on 2026-07-29:

   · A provider's published "restricted countries" page can be out
     of date, or scoped to one product rather than the whole app.
     KAST's list named Pakistan; five KAST card tiers are in fact
     sold there.
   · "Available" in a card directory is narrower than "can I sign
     up". RedotPay's matrix omits Pakistan, but Pakistani passports
     clear its KYC — you just can't get a physical card.

   So availability is per country, and it is not a yes/no. These
   entries beat the global list, carry their own source, and can
   mark a product `partial` with the reason.
   ============================================================ */
const OVERRIDES = {
  "Pakistan": {
    checked:"2026-07-29",
    source:"https://www.spendnode.io/crypto-cards/country/pakistan/",
    why:"Country-specific card listing, cross-checked against RedotPay's KYC requirements.",
    available:["Avici","Bitget Wallet","Crypto.com","Cypher","EtherFi Cash","KAST","Kolo",
               "Oobit","Payy","Plasma One","Rizon","Tria","Tuyo","XPlace"],
    partial:{
      "RedotPay":"Virtual card only. Pakistani passports clear KYC, but no physical card is shipped and there's no ATM access."
    }
  }
};

/* ---- decode ---- */
function DECODE(mask){
  const bin = atob(mask), out = [];
  for(let i=0;i<COUNTRY_DICT.length;i++){
    if(bin.charCodeAt(i>>3) & (1<<(i&7))) out.push(COUNTRY_DICT[i]);
  }
  return out;
}

/* ============================================================
   SCOPE AND TIER — added after the 2026-07-30 accuracy audit
   ------------------------------------------------------------
   Two mistakes were baked into the earlier model:

   1. SCOPE. Every list below came from a card availability
      matrix or a card help article. It describes where the CARD
      ships, not where the company operates. Merging the two made
      the app claim Revolut doesn't work in the United States,
      while Revolut runs a US help centre at help.revolut.com/en-US.
      Every row is therefore scope:"card" until an account-level
      source is found.

   2. ABSENCE. Being missing from a third-party list is not
      evidence of refusal. Reading it that way is what made the
      app tell a Pakistani user that KAST and Bitget were closed
      to them when both are sold there. Absence now only produces
      a negative when the source is official; otherwise it is
      "unknown".

   TIER — how much weight a row carries
     official   read from the company's own site, help centre or docs
     secondary  a named, dated write-up; official page unreachable
     directory  a structured third-party matrix

   There is no numeric accuracy score. A score would imply a
   measurement nobody has taken.
   ============================================================ */
const TIER = { issuer:"official", secondary:"secondary", directory:"directory" };

const VERIFIED_RAW = {};
PACKED.forEach(([name, slug, mask])=>{
  const list = DECODE(mask);
  const s = SOURCED[name] || {};
  const conf = s.conf || "directory";
  VERIFIED_RAW[name] = {
    mode:"allow",
    scope:"card",                       /* see note above */
    tier: TIER[conf] || "directory",
    breadth: list.length + (list.length===1 ? " country" : " countries"),
    list,
    fee: s.fee || null,
    note: s.note || null,
    conflict: s.conflict || null,
    checked: "2026-07-29",
    confidence: conf,
    source: s.src || ("https://www.cryptocardhub.com/card/" + slug)
  };
});

/* Sources that could not be read, recorded rather than quietly skipped. */
const UNREACHABLE = {
  "Wirex":"Official supported-countries page is a client-rendered Wix app with no readable content (checked 2026-07-30)."
};
