/* ============================================================
   NEOBANK ATLAS — HAND-VERIFIED AVAILABILITY LAYER
   ------------------------------------------------------------
   Each entry was checked against the issuer's own documentation
   where reachable, and a secondary source otherwise. Confidence
   is recorded per row; nothing here is inferred.

   mode:"block"  → open broadly, EXCEPT the countries in `list`
   mode:"allow"  → available ONLY in the countries in `list`

   Most crypto cards are "block" shaped. The open dataset can only
   express "allow", which is exactly why its country data is wrong.

   Availability rots. `checked` is the date, and the UI marks any
   row older than 180 days as due for re-checking.
   ============================================================ */

const EEA = ["Austria","Belgium","Bulgaria","Croatia","Cyprus","Czechia","Denmark","Estonia","Finland",
  "France","Germany","Greece","Hungary","Iceland","Ireland","Italy","Latvia","Liechtenstein","Lithuania",
  "Luxembourg","Malta","Netherlands","Norway","Poland","Portugal","Romania","Slovakia","Slovenia",
  "Spain","Sweden"];

const VERIFIED_RAW = {

  "RedotPay": {
    mode:"block", breadth:"130+ countries",
    fee:"Virtual card $5 · physical $100 · no annual fee",
    checked:"2026-07-29", confidence:"secondary",
    source:"https://redotpayhelp.com/supported-countries",
    list:["United States","China","Russia","Ukraine","Venezuela","Iran","Iraq","Syria","North Korea",
      "Afghanistan","Albania","Algeria","Bangladesh","Belarus"]
  },

  "KAST": {
    mode:"block", breadth:"170+ countries",
    fee:"Tiered cards · cashback up to 3% in stablecoin",
    note:"Bans a lot of the emerging markets it markets itself to.",
    checked:"2026-07-29", confidence:"issuer",
    source:"https://concierge.kast.xyz/hc/en-us/articles/13939999566095-Is-the-KAST-Card-Available-in-My-Country",
    list:["Afghanistan","Albania","Armenia","Belarus","Bulgaria","Burkina Faso","Burundi","Cambodia",
      "Cameroon","Central African Rep.","China","Cuba","Eritrea","Guinea-Bissau","Haiti","Indonesia",
      "Iran","Iraq","Jamaica","Jordan","Kenya","North Korea","Lebanon","Liberia","Libya","Mali","Morocco",
      "Mozambique","Myanmar","Namibia","Nicaragua","Pakistan","Palau","Philippines","Russia","Rwanda",
      "Senegal","Sierra Leone","Somalia","South Africa","S. Sudan","Sudan","Syria","Tanzania","Uganda",
      "Ukraine","Venezuela","Yemen","Zimbabwe"]
  },

  "Plasma One": {
    mode:"block", breadth:"150+ countries · invite only",
    fee:"Up to 4% XPL cashback · 10%+ APY on USD₮",
    note:"Waitlist. You need a 6-character invite code to open an account.",
    checked:"2026-07-29", confidence:"secondary",
    source:"https://www.plasma.org/personal",
    list:["United States","Cuba","Iran","North Korea","Syria"]
  },

  "EtherFi Cash": {
    mode:"block", breadth:"Most of Europe, LatAm, APAC, UAE",
    fee:"Up to 3% cashback · borrow against restaked collateral",
    note:"Live in the US, but not in 20 states.",
    checked:"2026-07-29", confidence:"issuer",
    source:"https://help.ether.fi/en/articles/262373-where-is-ether-fi-currently-unavailable",
    list:["Belarus","Bangladesh","China","Cuba","Estonia","Finland","Hungary","India","Iraq","Israel",
      "Nepal","Netherlands","North Korea","Philippines","Russia","Syria","Turkey","Ukraine","Venezuela",
      "Vietnam"]
  },

  "Wirex": {
    mode:"allow", breadth:"UK, EEA and selected APAC / LatAm markets",
    fee:"0% Wirex FX markup · no annual fee · free card issuance",
    checked:"2026-07-29", confidence:"issuer",
    source:"https://www.wirexapp.com/help/article/supported-countries-1189",
    list:[...EEA,"United Kingdom","Switzerland","Montenegro","Monaco","Andorra","Gibraltar",
      "Australia","New Zealand","Hong Kong","Philippines","Taiwan","Thailand","Vietnam","Malaysia",
      "Indonesia","Singapore","Brazil","Argentina","Mexico","Chile","Colombia","Peru","Ecuador"]
  },

  "Nexo": {
    mode:"allow", breadth:"EEA, UK, Switzerland, Andorra only",
    fee:"0.2% FX in EEA/UK, 2% rest of world · 0.75% crypto→EURx swap · no annual fee",
    note:"Despite the global branding, the card is an EEA/UK product.",
    checked:"2026-07-29", confidence:"secondary",
    source:"https://supportedcountries.com/nexo-card/",
    list:[...EEA.filter(c=>c!=="Bulgaria"),"United Kingdom","Switzerland","Andorra"]
  },

  "Gnosis Pay": {
    mode:"allow", breadth:"EEA, UK, Switzerland + Argentina and Brazil",
    fee:"No annual fee · up to 5% GNO cashback",
    note:"Card is wired to a Safe you control; IBAN eligibility is narrower than card eligibility.",
    checked:"2026-07-29", confidence:"issuer",
    source:"https://help.gnosispay.com/hc/en-us/articles/39401751918612-Supported-Countries-for-Gnosis-Pay",
    list:[...EEA,"United Kingdom","Switzerland","Argentina","Brazil"]
  },

  "COCA": {
    mode:"allow", breadth:"70 countries",
    fee:"0% FX · up to 8% cashback within a monthly allowance",
    note:"Not available to US residents.",
    checked:"2026-07-29", confidence:"secondary",
    source:"https://www.spendnode.io/crypto-cards/coca/",
    list:["Andorra","Argentina","Australia","Austria","Azerbaijan","Belgium","Brazil","Bulgaria","Chile",
      "Colombia","Croatia","Cyprus","Czechia","Denmark","Ecuador","El Salvador","Estonia","Finland",
      "France","Georgia","Germany","Ghana","Gibraltar","Greece","Hong Kong","Hungary","Iceland","Ireland",
      "Israel","Italy","Japan","Kazakhstan","Kenya","Latvia","Liechtenstein","Lithuania","Luxembourg",
      "Malaysia","Malta","Mexico","Moldova","Monaco","Montenegro","New Zealand","Nigeria","Norway","Oman",
      "Panama","Peru","Philippines","Poland","Portugal","Romania","Saudi Arabia","Slovakia","Slovenia",
      "South Africa","South Korea","Spain","Sweden","Switzerland","Taiwan","Thailand","Netherlands",
      "Turkey","Uganda","Ukraine","United Arab Emirates","United Kingdom","Uzbekistan","Vietnam"]
  },

  "Bleap": {
    mode:"allow", breadth:"EEA, UK and Switzerland · LatAm rolling out",
    fee:"Zero FX · free ATM tier",
    note:"Not available to US residents.",
    checked:"2026-07-29", confidence:"issuer",
    source:"https://www.bleap.finance/en-us/legal-agreements/bleap-cardholder-terms-eea",
    list:[...EEA,"United Kingdom","Switzerland","Monaco"]
  },

  "Crypto.com": {
    mode:"allow", breadth:"US (49 states), UK, EEA, Canada, Australia, Singapore, Brazil",
    fee:"2% ATM above free allowance · EU top-up 1% · FX by tier (US up to 3%)",
    note:"Not available in New York. 80+ countries restricted from the app entirely.",
    checked:"2026-07-29", confidence:"issuer",
    source:"https://help.crypto.com/en/articles/1341655-which-are-the-available-markets",
    list:[...EEA,"United Kingdom","Switzerland","United States","Canada","Australia","Singapore","Brazil"]
  },

  "Bybit Card": {
    mode:"allow", breadth:"EEA via MiCA passporting (29 states) + selected markets",
    fee:"FX by region: EEA 0.5%, AU 1%, BR 1.5%, APAC/MX 2%, AR 7% · +0.9% if crypto-funded",
    note:"Services suspended in France since January 2025.",
    checked:"2026-07-29", confidence:"issuer",
    source:"https://www.bybit.com/en/help-center/article/FAQ--Changes-to-Bybit-Card-Services-in-the-EEA--CH",
    list:[...EEA.filter(c=>c!=="France"),"Switzerland","Australia","Brazil","Mexico","Argentina"]
  },

  "Bitget Wallet": {
    mode:"block", breadth:"Asia-Pacific, EEA and LatAm",
    fee:"Issuer varies by region (DCS in Asia, Immersve in EU/LatAm)",
    note:"Physical cards in SG, KR, JP, VN, MY, TW, AU, TH, PH.",
    checked:"2026-07-29", confidence:"secondary",
    source:"https://web3.bitget.com/card",
    list:["United States","Canada","India","Turkey","Russia","Israel","Pakistan","Bangladesh",
      "Saudi Arabia","United Arab Emirates","Egypt","Iran","Iraq","Qatar","Kuwait"]
  }
};
