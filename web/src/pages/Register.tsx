import { FOCKIS_API_URL } from "../config/fockisConfig";

import "../styles/Register.scss";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import axios from "axios";

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  FOCKIS_API_URL
).replace(/\/+$/, "");

// ============================================================================
// COUNTRY DATA
// ============================================================================

interface Country {
  code: string;
  name: string;
  callingCode: string;
  flag: string;
}

// Complete country list with ISO alpha-2 codes and international calling codes.
const COUNTRIES: Country[] = [
  // --------------------------------------------------------------------------
  // A
  // --------------------------------------------------------------------------
  {
    code: "AF",
    name: "Afghanistan",
    callingCode: "+93",
    flag: "🇦🇫",
  },
  {
    code: "AL",
    name: "Albania",
    callingCode: "+355",
    flag: "🇦🇱",
  },
  {
    code: "DZ",
    name: "Algeria",
    callingCode: "+213",
    flag: "🇩🇿",
  },
  {
    code: "AD",
    name: "Andorra",
    callingCode: "+376",
    flag: "🇦🇩",
  },
  {
    code: "AO",
    name: "Angola",
    callingCode: "+244",
    flag: "🇦🇴",
  },
  {
    code: "AG",
    name: "Antigua and Barbuda",
    callingCode: "+1",
    flag: "🇦🇬",
  },
  {
    code: "AR",
    name: "Argentina",
    callingCode: "+54",
    flag: "🇦🇷",
  },
  {
    code: "AM",
    name: "Armenia",
    callingCode: "+374",
    flag: "🇦🇲",
  },
  {
    code: "AU",
    name: "Australia",
    callingCode: "+61",
    flag: "🇦🇺",
  },
  {
    code: "AT",
    name: "Austria",
    callingCode: "+43",
    flag: "🇦🇹",
  },
  {
    code: "AZ",
    name: "Azerbaijan",
    callingCode: "+994",
    flag: "🇦🇿",
  },

  // --------------------------------------------------------------------------
  // B
  // --------------------------------------------------------------------------
  {
    code: "BS",
    name: "Bahamas",
    callingCode: "+1",
    flag: "🇧🇸",
  },
  {
    code: "BH",
    name: "Bahrain",
    callingCode: "+973",
    flag: "🇧🇭",
  },
  {
    code: "BD",
    name: "Bangladesh",
    callingCode: "+880",
    flag: "🇧🇩",
  },
  {
    code: "BB",
    name: "Barbados",
    callingCode: "+1",
    flag: "🇧🇧",
  },
  {
    code: "BY",
    name: "Belarus",
    callingCode: "+375",
    flag: "🇧🇾",
  },
  {
    code: "BE",
    name: "Belgium",
    callingCode: "+32",
    flag: "🇧🇪",
  },
  {
    code: "BZ",
    name: "Belize",
    callingCode: "+501",
    flag: "🇧🇿",
  },
  {
    code: "BJ",
    name: "Benin",
    callingCode: "+229",
    flag: "🇧🇯",
  },
  {
    code: "BT",
    name: "Bhutan",
    callingCode: "+975",
    flag: "🇧🇹",
  },
  {
    code: "BO",
    name: "Bolivia",
    callingCode: "+591",
    flag: "🇧🇴",
  },
  {
    code: "BA",
    name: "Bosnia and Herzegovina",
    callingCode: "+387",
    flag: "🇧🇦",
  },
  {
    code: "BW",
    name: "Botswana",
    callingCode: "+267",
    flag: "🇧🇼",
  },
  {
    code: "BR",
    name: "Brazil",
    callingCode: "+55",
    flag: "🇧🇷",
  },
  {
    code: "BN",
    name: "Brunei",
    callingCode: "+673",
    flag: "🇧🇳",
  },
  {
    code: "BG",
    name: "Bulgaria",
    callingCode: "+359",
    flag: "🇧🇬",
  },
  {
    code: "BF",
    name: "Burkina Faso",
    callingCode: "+226",
    flag: "🇧🇫",
  },
  {
    code: "BI",
    name: "Burundi",
    callingCode: "+257",
    flag: "🇧🇮",
  },

  // --------------------------------------------------------------------------
  // C
  // --------------------------------------------------------------------------
  {
    code: "CV",
    name: "Cabo Verde",
    callingCode: "+238",
    flag: "🇨🇻",
  },
  {
    code: "KH",
    name: "Cambodia",
    callingCode: "+855",
    flag: "🇰🇭",
  },
  {
    code: "CM",
    name: "Cameroon",
    callingCode: "+237",
    flag: "🇨🇲",
  },
  {
    code: "CA",
    name: "Canada",
    callingCode: "+1",
    flag: "🇨🇦",
  },
  {
    code: "CF",
    name: "Central African Republic",
    callingCode: "+236",
    flag: "🇨🇫",
  },
  {
    code: "TD",
    name: "Chad",
    callingCode: "+235",
    flag: "🇹🇩",
  },
  {
    code: "CL",
    name: "Chile",
    callingCode: "+56",
    flag: "🇨🇱",
  },
  {
    code: "CN",
    name: "China",
    callingCode: "+86",
    flag: "🇨🇳",
  },
  {
    code: "CO",
    name: "Colombia",
    callingCode: "+57",
    flag: "🇨🇴",
  },
  {
    code: "KM",
    name: "Comoros",
    callingCode: "+269",
    flag: "🇰🇲",
  },
  {
    code: "CG",
    name: "Republic of the Congo",
    callingCode: "+242",
    flag: "🇨🇬",
  },
  {
    code: "CD",
    name: "Democratic Republic of the Congo",
    callingCode: "+243",
    flag: "🇨🇩",
  },
  {
    code: "CR",
    name: "Costa Rica",
    callingCode: "+506",
    flag: "🇨🇷",
  },
  {
    code: "CI",
    name: "Côte d'Ivoire",
    callingCode: "+225",
    flag: "🇨🇮",
  },
  {
    code: "HR",
    name: "Croatia",
    callingCode: "+385",
    flag: "🇭🇷",
  },
  {
    code: "CU",
    name: "Cuba",
    callingCode: "+53",
    flag: "🇨🇺",
  },
  {
    code: "CY",
    name: "Cyprus",
    callingCode: "+357",
    flag: "🇨🇾",
  },
  {
    code: "CZ",
    name: "Czechia",
    callingCode: "+420",
    flag: "🇨🇿",
  },

  // --------------------------------------------------------------------------
  // D
  // --------------------------------------------------------------------------
  {
    code: "DK",
    name: "Denmark",
    callingCode: "+45",
    flag: "🇩🇰",
  },
  {
    code: "DJ",
    name: "Djibouti",
    callingCode: "+253",
    flag: "🇩🇯",
  },
  {
    code: "DM",
    name: "Dominica",
    callingCode: "+1",
    flag: "🇩🇲",
  },
  {
    code: "DO",
    name: "Dominican Republic",
    callingCode: "+1",
    flag: "🇩🇴",
  },

  // --------------------------------------------------------------------------
  // E
  // --------------------------------------------------------------------------
  {
    code: "EC",
    name: "Ecuador",
    callingCode: "+593",
    flag: "🇪🇨",
  },
  {
    code: "EG",
    name: "Egypt",
    callingCode: "+20",
    flag: "🇪🇬",
  },
  {
    code: "SV",
    name: "El Salvador",
    callingCode: "+503",
    flag: "🇸🇻",
  },
  {
    code: "GQ",
    name: "Equatorial Guinea",
    callingCode: "+240",
    flag: "🇬🇶",
  },
  {
    code: "ER",
    name: "Eritrea",
    callingCode: "+291",
    flag: "🇪🇷",
  },
  {
    code: "EE",
    name: "Estonia",
    callingCode: "+372",
    flag: "🇪🇪",
  },
  {
    code: "SZ",
    name: "Eswatini",
    callingCode: "+268",
    flag: "🇸🇿",
  },
  {
    code: "ET",
    name: "Ethiopia",
    callingCode: "+251",
    flag: "🇪🇹",
  },

  // --------------------------------------------------------------------------
  // F
  // --------------------------------------------------------------------------
  {
    code: "FJ",
    name: "Fiji",
    callingCode: "+679",
    flag: "🇫🇯",
  },
  {
    code: "FI",
    name: "Finland",
    callingCode: "+358",
    flag: "🇫🇮",
  },
  {
    code: "FR",
    name: "France",
    callingCode: "+33",
    flag: "🇫🇷",
  },

  // --------------------------------------------------------------------------
  // G
  // --------------------------------------------------------------------------
  {
    code: "GA",
    name: "Gabon",
    callingCode: "+241",
    flag: "🇬🇦",
  },
  {
    code: "GM",
    name: "Gambia",
    callingCode: "+220",
    flag: "🇬🇲",
  },
  {
    code: "GE",
    name: "Georgia",
    callingCode: "+995",
    flag: "🇬🇪",
  },
  {
    code: "DE",
    name: "Germany",
    callingCode: "+49",
    flag: "🇩🇪",
  },
  {
    code: "GH",
    name: "Ghana",
    callingCode: "+233",
    flag: "🇬🇭",
  },
  {
    code: "GR",
    name: "Greece",
    callingCode: "+30",
    flag: "🇬🇷",
  },
  {
    code: "GD",
    name: "Grenada",
    callingCode: "+1",
    flag: "🇬🇩",
  },
  {
    code: "GT",
    name: "Guatemala",
    callingCode: "+502",
    flag: "🇬🇹",
  },
  {
    code: "GN",
    name: "Guinea",
    callingCode: "+224",
    flag: "🇬🇳",
  },
  {
    code: "GW",
    name: "Guinea-Bissau",
    callingCode: "+245",
    flag: "🇬🇼",
  },
  {
    code: "GY",
    name: "Guyana",
    callingCode: "+592",
    flag: "🇬🇾",
  },

  // --------------------------------------------------------------------------
  // H
  // --------------------------------------------------------------------------
  {
    code: "HT",
    name: "Haiti",
    callingCode: "+509",
    flag: "🇭🇹",
  },
  {
    code: "HN",
    name: "Honduras",
    callingCode: "+504",
    flag: "🇭🇳",
  },
  {
    code: "HU",
    name: "Hungary",
    callingCode: "+36",
    flag: "🇭🇺",
  },

  // --------------------------------------------------------------------------
  // I
  // --------------------------------------------------------------------------
  {
    code: "IS",
    name: "Iceland",
    callingCode: "+354",
    flag: "🇮🇸",
  },
  {
    code: "IN",
    name: "India",
    callingCode: "+91",
    flag: "🇮🇳",
  },
  {
    code: "ID",
    name: "Indonesia",
    callingCode: "+62",
    flag: "🇮🇩",
  },
  {
    code: "IR",
    name: "Iran",
    callingCode: "+98",
    flag: "🇮🇷",
  },
  {
    code: "IQ",
    name: "Iraq",
    callingCode: "+964",
    flag: "🇮🇶",
  },
  {
    code: "IE",
    name: "Ireland",
    callingCode: "+353",
    flag: "🇮🇪",
  },
  {
    code: "IL",
    name: "Israel",
    callingCode: "+972",
    flag: "🇮🇱",
  },
  {
    code: "IT",
    name: "Italy",
    callingCode: "+39",
    flag: "🇮🇹",
  },

  // --------------------------------------------------------------------------
  // J
  // --------------------------------------------------------------------------
  {
    code: "JM",
    name: "Jamaica",
    callingCode: "+1",
    flag: "🇯🇲",
  },
  {
    code: "JP",
    name: "Japan",
    callingCode: "+81",
    flag: "🇯🇵",
  },
  {
    code: "JO",
    name: "Jordan",
    callingCode: "+962",
    flag: "🇯🇴",
  },

  // --------------------------------------------------------------------------
  // K
  // --------------------------------------------------------------------------
  {
    code: "KZ",
    name: "Kazakhstan",
    callingCode: "+7",
    flag: "🇰🇿",
  },
  {
    code: "KE",
    name: "Kenya",
    callingCode: "+254",
    flag: "🇰🇪",
  },
  {
    code: "KI",
    name: "Kiribati",
    callingCode: "+686",
    flag: "🇰🇮",
  },
  {
    code: "KP",
    name: "North Korea",
    callingCode: "+850",
    flag: "🇰🇵",
  },
  {
    code: "KR",
    name: "South Korea",
    callingCode: "+82",
    flag: "🇰🇷",
  },
  {
    code: "KW",
    name: "Kuwait",
    callingCode: "+965",
    flag: "🇰🇼",
  },
  {
    code: "KG",
    name: "Kyrgyzstan",
    callingCode: "+996",
    flag: "🇰🇬",
  },

  // --------------------------------------------------------------------------
  // L
  // --------------------------------------------------------------------------
  {
    code: "LA",
    name: "Laos",
    callingCode: "+856",
    flag: "🇱🇦",
  },
  {
    code: "LV",
    name: "Latvia",
    callingCode: "+371",
    flag: "🇱🇻",
  },
  {
    code: "LB",
    name: "Lebanon",
    callingCode: "+961",
    flag: "🇱🇧",
  },
  {
    code: "LS",
    name: "Lesotho",
    callingCode: "+266",
    flag: "🇱🇸",
  },
  {
    code: "LR",
    name: "Liberia",
    callingCode: "+231",
    flag: "🇱🇷",
  },
  {
    code: "LY",
    name: "Libya",
    callingCode: "+218",
    flag: "🇱🇾",
  },
  {
    code: "LI",
    name: "Liechtenstein",
    callingCode: "+423",
    flag: "🇱🇮",
  },
  {
    code: "LT",
    name: "Lithuania",
    callingCode: "+370",
    flag: "🇱🇹",
  },
  {
    code: "LU",
    name: "Luxembourg",
    callingCode: "+352",
    flag: "🇱🇺",
  },

  // --------------------------------------------------------------------------
  // M
  // --------------------------------------------------------------------------
  {
    code: "MG",
    name: "Madagascar",
    callingCode: "+261",
    flag: "🇲🇬",
  },
  {
    code: "MW",
    name: "Malawi",
    callingCode: "+265",
    flag: "🇲🇼",
  },
  {
    code: "MY",
    name: "Malaysia",
    callingCode: "+60",
    flag: "🇲🇾",
  },
  {
    code: "MV",
    name: "Maldives",
    callingCode: "+960",
    flag: "🇲🇻",
  },
  {
    code: "ML",
    name: "Mali",
    callingCode: "+223",
    flag: "🇲🇱",
  },
  {
    code: "MT",
    name: "Malta",
    callingCode: "+356",
    flag: "🇲🇹",
  },
  {
    code: "MH",
    name: "Marshall Islands",
    callingCode: "+692",
    flag: "🇲🇭",
  },
  {
    code: "MR",
    name: "Mauritania",
    callingCode: "+222",
    flag: "🇲🇷",
  },
  {
    code: "MU",
    name: "Mauritius",
    callingCode: "+230",
    flag: "🇲🇺",
  },
  {
    code: "MX",
    name: "Mexico",
    callingCode: "+52",
    flag: "🇲🇽",
  },
  {
    code: "FM",
    name: "Micronesia",
    callingCode: "+691",
    flag: "🇫🇲",
  },
  {
    code: "MD",
    name: "Moldova",
    callingCode: "+373",
    flag: "🇲🇩",
  },
  {
    code: "MC",
    name: "Monaco",
    callingCode: "+377",
    flag: "🇲🇨",
  },
  {
    code: "MN",
    name: "Mongolia",
    callingCode: "+976",
    flag: "🇲🇳",
  },
  {
    code: "ME",
    name: "Montenegro",
    callingCode: "+382",
    flag: "🇲🇪",
  },
  {
    code: "MA",
    name: "Morocco",
    callingCode: "+212",
    flag: "🇲🇦",
  },
  {
    code: "MZ",
    name: "Mozambique",
    callingCode: "+258",
    flag: "🇲🇿",
  },
  {
    code: "MM",
    name: "Myanmar",
    callingCode: "+95",
    flag: "🇲🇲",
  },

  // --------------------------------------------------------------------------
  // N
  // --------------------------------------------------------------------------
  {
    code: "NA",
    name: "Namibia",
    callingCode: "+264",
    flag: "🇳🇦",
  },
  {
    code: "NR",
    name: "Nauru",
    callingCode: "+674",
    flag: "🇳🇷",
  },
  {
    code: "NP",
    name: "Nepal",
    callingCode: "+977",
    flag: "🇳🇵",
  },
  {
    code: "NL",
    name: "Netherlands",
    callingCode: "+31",
    flag: "🇳🇱",
  },
  {
    code: "NZ",
    name: "New Zealand",
    callingCode: "+64",
    flag: "🇳🇿",
  },
  {
    code: "NI",
    name: "Nicaragua",
    callingCode: "+505",
    flag: "🇳🇮",
  },
  {
    code: "NE",
    name: "Niger",
    callingCode: "+227",
    flag: "🇳🇪",
  },
  {
    code: "NG",
    name: "Nigeria",
    callingCode: "+234",
    flag: "🇳🇬",
  },
  {
    code: "MK",
    name: "North Macedonia",
    callingCode: "+389",
    flag: "🇲🇰",
  },
  {
    code: "NO",
    name: "Norway",
    callingCode: "+47",
    flag: "🇳🇴",
  },

  // --------------------------------------------------------------------------
  // O
  // --------------------------------------------------------------------------
  {
    code: "OM",
    name: "Oman",
    callingCode: "+968",
    flag: "🇴🇲",
  },

  // --------------------------------------------------------------------------
  // P
  // --------------------------------------------------------------------------
  {
    code: "PK",
    name: "Pakistan",
    callingCode: "+92",
    flag: "🇵🇰",
  },
  {
    code: "PW",
    name: "Palau",
    callingCode: "+680",
    flag: "🇵🇼",
  },
  {
    code: "PS",
    name: "Palestine",
    callingCode: "+970",
    flag: "🇵🇸",
  },
  {
    code: "PA",
    name: "Panama",
    callingCode: "+507",
    flag: "🇵🇦",
  },
  {
    code: "PG",
    name: "Papua New Guinea",
    callingCode: "+675",
    flag: "🇵🇬",
  },
  {
    code: "PY",
    name: "Paraguay",
    callingCode: "+595",
    flag: "🇵🇾",
  },
  {
    code: "PE",
    name: "Peru",
    callingCode: "+51",
    flag: "🇵🇪",
  },
  {
    code: "PH",
    name: "Philippines",
    callingCode: "+63",
    flag: "🇵🇭",
  },
  {
    code: "PL",
    name: "Poland",
    callingCode: "+48",
    flag: "🇵🇱",
  },
  {
    code: "PT",
    name: "Portugal",
    callingCode: "+351",
    flag: "🇵🇹",
  },
  {
    code: "PR",
    name: "Puerto Rico",
    callingCode: "+1",
    flag: "🇵🇷",
  },

  // --------------------------------------------------------------------------
  // Q
  // --------------------------------------------------------------------------
  {
    code: "QA",
    name: "Qatar",
    callingCode: "+974",
    flag: "🇶🇦",
  },

  // --------------------------------------------------------------------------
  // R
  // --------------------------------------------------------------------------
  {
    code: "RO",
    name: "Romania",
    callingCode: "+40",
    flag: "🇷🇴",
  },
  {
    code: "RU",
    name: "Russia",
    callingCode: "+7",
    flag: "🇷🇺",
  },
  {
    code: "RW",
    name: "Rwanda",
    callingCode: "+250",
    flag: "🇷🇼",
  },

  // --------------------------------------------------------------------------
  // S
  // --------------------------------------------------------------------------
  {
    code: "KN",
    name: "Saint Kitts and Nevis",
    callingCode: "+1",
    flag: "🇰🇳",
  },
  {
    code: "LC",
    name: "Saint Lucia",
    callingCode: "+1",
    flag: "🇱🇨",
  },
  {
    code: "VC",
    name: "Saint Vincent and the Grenadines",
    callingCode: "+1",
    flag: "🇻🇨",
  },
  {
    code: "WS",
    name: "Samoa",
    callingCode: "+685",
    flag: "🇼🇸",
  },
  {
    code: "SM",
    name: "San Marino",
    callingCode: "+378",
    flag: "🇸🇲",
  },
  {
    code: "ST",
    name: "São Tomé and Príncipe",
    callingCode: "+239",
    flag: "🇸🇹",
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    callingCode: "+966",
    flag: "🇸🇦",
  },
  {
    code: "SN",
    name: "Senegal",
    callingCode: "+221",
    flag: "🇸🇳",
  },
  {
    code: "RS",
    name: "Serbia",
    callingCode: "+381",
    flag: "🇷🇸",
  },
  {
    code: "SC",
    name: "Seychelles",
    callingCode: "+248",
    flag: "🇸🇨",
  },
  {
    code: "SL",
    name: "Sierra Leone",
    callingCode: "+232",
    flag: "🇸🇱",
  },
  {
    code: "SG",
    name: "Singapore",
    callingCode: "+65",
    flag: "🇸🇬",
  },
  {
    code: "SK",
    name: "Slovakia",
    callingCode: "+421",
    flag: "🇸🇰",
  },
  {
    code: "SI",
    name: "Slovenia",
    callingCode: "+386",
    flag: "🇸🇮",
  },
  {
    code: "SB",
    name: "Solomon Islands",
    callingCode: "+677",
    flag: "🇸🇧",
  },
  {
    code: "SO",
    name: "Somalia",
    callingCode: "+252",
    flag: "🇸🇴",
  },
  {
    code: "ZA",
    name: "South Africa",
    callingCode: "+27",
    flag: "🇿🇦",
  },
  {
    code: "SS",
    name: "South Sudan",
    callingCode: "+211",
    flag: "🇸🇸",
  },
  {
    code: "ES",
    name: "Spain",
    callingCode: "+34",
    flag: "🇪🇸",
  },
  {
    code: "LK",
    name: "Sri Lanka",
    callingCode: "+94",
    flag: "🇱🇰",
  },
  {
    code: "SD",
    name: "Sudan",
    callingCode: "+249",
    flag: "🇸🇩",
  },
  {
    code: "SR",
    name: "Suriname",
    callingCode: "+597",
    flag: "🇸🇷",
  },
  {
    code: "SE",
    name: "Sweden",
    callingCode: "+46",
    flag: "🇸🇪",
  },
  {
    code: "CH",
    name: "Switzerland",
    callingCode: "+41",
    flag: "🇨🇭",
  },
  {
    code: "SY",
    name: "Syria",
    callingCode: "+963",
    flag: "🇸🇾",
  },

  // --------------------------------------------------------------------------
  // T
  // --------------------------------------------------------------------------
  {
    code: "TW",
    name: "Taiwan",
    callingCode: "+886",
    flag: "🇹🇼",
  },
  {
    code: "TJ",
    name: "Tajikistan",
    callingCode: "+992",
    flag: "🇹🇯",
  },
  {
    code: "TZ",
    name: "Tanzania",
    callingCode: "+255",
    flag: "🇹🇿",
  },
  {
    code: "TH",
    name: "Thailand",
    callingCode: "+66",
    flag: "🇹🇭",
  },
  {
    code: "TL",
    name: "Timor-Leste",
    callingCode: "+670",
    flag: "🇹🇱",
  },
  {
    code: "TG",
    name: "Togo",
    callingCode: "+228",
    flag: "🇹🇬",
  },
  {
    code: "TO",
    name: "Tonga",
    callingCode: "+676",
    flag: "🇹🇴",
  },
  {
    code: "TT",
    name: "Trinidad and Tobago",
    callingCode: "+1",
    flag: "🇹🇹",
  },
  {
    code: "TN",
    name: "Tunisia",
    callingCode: "+216",
    flag: "🇹🇳",
  },
  {
    code: "TR",
    name: "Türkiye",
    callingCode: "+90",
    flag: "🇹🇷",
  },
  {
    code: "TM",
    name: "Turkmenistan",
    callingCode: "+993",
    flag: "🇹🇲",
  },
  {
    code: "TV",
    name: "Tuvalu",
    callingCode: "+688",
    flag: "🇹🇻",
  },

  // --------------------------------------------------------------------------
  // U
  // --------------------------------------------------------------------------
  {
    code: "UG",
    name: "Uganda",
    callingCode: "+256",
    flag: "🇺🇬",
  },
  {
    code: "UA",
    name: "Ukraine",
    callingCode: "+380",
    flag: "🇺🇦",
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    callingCode: "+971",
    flag: "🇦🇪",
  },
  {
    code: "GB",
    name: "United Kingdom",
    callingCode: "+44",
    flag: "🇬🇧",
  },
  {
    code: "US",
    name: "United States",
    callingCode: "+1",
    flag: "🇺🇸",
  },
  {
    code: "UY",
    name: "Uruguay",
    callingCode: "+598",
    flag: "🇺🇾",
  },
  {
    code: "UZ",
    name: "Uzbekistan",
    callingCode: "+998",
    flag: "🇺🇿",
  },

  // --------------------------------------------------------------------------
  // V
  // --------------------------------------------------------------------------
  {
    code: "VU",
    name: "Vanuatu",
    callingCode: "+678",
    flag: "🇻🇺",
  },
  {
    code: "VA",
    name: "Vatican City",
    callingCode: "+39",
    flag: "🇻🇦",
  },
  {
    code: "VE",
    name: "Venezuela",
    callingCode: "+58",
    flag: "🇻🇪",
  },
  {
    code: "VN",
    name: "Vietnam",
    callingCode: "+84",
    flag: "🇻🇳",
  },

  // --------------------------------------------------------------------------
  // Y
  // --------------------------------------------------------------------------
  {
    code: "YE",
    name: "Yemen",
    callingCode: "+967",
    flag: "🇾🇪",
  },

  // --------------------------------------------------------------------------
  // Z
  // --------------------------------------------------------------------------
  {
    code: "ZM",
    name: "Zambia",
    callingCode: "+260",
    flag: "🇿🇲",
  },
  {
    code: "ZW",
    name: "Zimbabwe",
    callingCode: "+263",
    flag: "🇿🇼",
  },
];

// ============================================================================
// REGISTER COMPONENT
// ============================================================================

export default function Register() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [countryCode, setCountryCode] = useState("");
  const [countrySearch, setCountrySearch] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);

  // ==========================================================================
  // SELECTED COUNTRY
  // ==========================================================================

  const selectedCountry = useMemo<Country | null>(
    () =>
      COUNTRIES.find(
        (country) => country.code === countryCode,
      ) ?? null,
    [countryCode],
  );

  // ==========================================================================
  // SEARCH COUNTRIES
  // ==========================================================================

  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();

    if (!query) {
      return COUNTRIES;
    }

    const normalizedQuery = query.replace(/\s+/g, "");

    return COUNTRIES.filter((country) => {
      const name = country.name.toLowerCase();
      const code = country.code.toLowerCase();
      const callingCode =
        country.callingCode.toLowerCase();

      const normalizedName = name.replace(/\s+/g, "");

      return (
        normalizedName.startsWith(normalizedQuery) ||
        name.startsWith(query) ||
        code.startsWith(query) ||
        callingCode.startsWith(query)
      );
    });
  }, [countrySearch]);

  // ==========================================================================
  // SELECT COUNTRY
  // ==========================================================================

  const handleCountrySelect = (
    code: string,
  ) => {
    setCountryCode(code.toUpperCase());
    setCountrySearch("");
  };

  // ==========================================================================
  // SUBMIT
  // ==========================================================================

  const submit = async (
    e: FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    // ========================================================================
    // REQUIRED FIELDS
    // ========================================================================

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !username.trim() ||
      !email.trim() ||
      !countryCode ||
      !password ||
      !confirmPassword
    ) {
      alert(
        "Please complete all required fields, including your country.",
      );
      return;
    }

    // ========================================================================
    // COUNTRY VALIDATION
    // ========================================================================

    const country = COUNTRIES.find(
      (item) => item.code === countryCode,
    );

    if (!country) {
      alert("Please select a valid country.");
      return;
    }

    // ========================================================================
    // PASSWORD MATCH
    // ========================================================================

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    // ========================================================================
    // PASSWORD SECURITY
    // ========================================================================

    if (password.length < 12) {
      alert(
        "Password must be at least 12 characters.",
      );
      return;
    }

    if (!/[A-Z]/.test(password)) {
      alert(
        "Password must contain at least one uppercase letter.",
      );
      return;
    }

    if (!/[a-z]/.test(password)) {
      alert(
        "Password must contain at least one lowercase letter.",
      );
      return;
    }

    if (!/[0-9]/.test(password)) {
      alert(
        "Password must contain at least one number.",
      );
      return;
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      alert(
        "Password must contain at least one special character.",
      );
      return;
    }

    // ========================================================================
    // REGISTER
    // ========================================================================

    try {
      setLoading(true);

      console.log(
        "[FOCKIS AUTH] REGISTER REQUEST:",
        `${API_BASE_URL}/auth/register`,
      );

      console.log(
        "[FOCKIS AUTH] COUNTRY:",
        {
          countryCode: country.code,
          countryName: country.name,
          callingCode: country.callingCode,
        },
      );

      // IMPORTANT:
      // Only countryCode is sent.
      //
      // Backend determines the callingCode.
      //
      // Example:
      // countryCode: "HT"
      // backend -> callingCode: "+509"

      const response = await axios.post(
        `${API_BASE_URL}/auth/register`,
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password,
          countryCode: country.code,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: 15000,
        },
      );

      console.log(
        "[FOCKIS AUTH] REGISTER SUCCESS:",
        response.data,
      );

      alert(
        `Account created successfully in ${country.name}.`,
      );

      navigate("/login", {
        replace: true,
      });
    } catch (error: unknown) {
      console.error(
        "[FOCKIS AUTH] REGISTER ERROR:",
        error,
      );

      if (axios.isAxiosError(error)) {
        console.error(
          "[FOCKIS AUTH] REGISTER STATUS:",
          error.response?.status,
        );

        console.error(
          "[FOCKIS AUTH] BACKEND RESPONSE:",
          error.response?.data,
        );

        const serverMessage =
          error.response?.data?.message;

        let message = "Registration failed.";

        if (Array.isArray(serverMessage)) {
          message = serverMessage
            .map(String)
            .join("\n");
        } else if (
          typeof serverMessage === "string" &&
          serverMessage.trim()
        ) {
          message = serverMessage;
        } else if (
          error.response?.status === 400
        ) {
          message =
            "Please check your registration information, including your country.";
        } else if (
          error.response?.status === 409
        ) {
          message =
            "An account with this email or username already exists.";
        } else if (
          error.response?.status === 500
        ) {
          message =
            "The Fockis server encountered an error. Please try again.";
        } else if (!error.response) {
          message =
            "Unable to connect to the Fockis API.";
        }

        alert(message);
      } else if (
        error instanceof Error &&
        error.message
      ) {
        alert(error.message);
      } else {
        alert("Registration failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // UI
  // ==========================================================================

  return (
    <div className="register-page">

      {/* ================================================================== */}
      {/* LEFT PANEL */}
      {/* ================================================================== */}

      <div className="auth-panel">

        <div className="auth-panel__top">
          <div className="wordmark">
            <span className="wordmark__brand">
              FOCKIS
            </span>
          </div>
        </div>

        <div className="auth-panel__hero">
          <p className="auth-panel__eyebrow">
            One account. One ecosystem.
            Endless possibilities.
          </p>

          <h1>
            Create your Fockis account.
          </h1>

          <p className="auth-panel__body">
            One account connects your social
            experience, marketplace activity,
            real-estate opportunities, career
            journey, and academic experience.
          </p>
        </div>

        {/* ================================================================ */}
        {/* ECOSYSTEM */}
        {/* ================================================================ */}

        <div className="ecosystem">

          <div className="ecosystem__label">
            Explore Fockis
          </div>

          <div className="constellation">

            <div className="node">
              <div className="node__dot">
                <IconUsers />
              </div>

              <div className="node__label">
                Social
              </div>
            </div>

            <div className="node">
              <div className="node__dot">
                <IconStore />
              </div>

              <div className="node__label">
                Marketplace
              </div>
            </div>

            <div className="node">
              <div className="node__dot">
                <IconBuilding />
              </div>

              <div className="node__label">
                Real Estate
              </div>
            </div>

            <div className="node">
              <div className="node__dot">
                <IconBriefcase />
              </div>

              <div className="node__label">
                Careers
              </div>
            </div>

            <div className="node">
              <div className="node__dot">
                <IconCap />
              </div>

              <div className="node__label">
                Academy
              </div>
            </div>

          </div>
        </div>

        {/* ================================================================ */}
        {/* TRUST NOTE */}
        {/* ================================================================ */}

        <div className="trust-note">
          <strong>
            One Fockis account. One connected
            experience.
          </strong>

          <span>
            Join once and get access to Social,
            Marketplace, Real Estate, Careers,
            and Academy — no separate sign-ups
            required.
          </span>
        </div>

      </div>

      {/* ================================================================== */}
      {/* RIGHT PANEL */}
      {/* ================================================================== */}

      <div className="form-panel">

        <div className="form-panel__wrap">

          <div className="form-header">

            <h2>
              Create account
            </h2>

            <p className="form-header__sub">
              Join Fockis
            </p>

            <p className="form-header__body">
              Join Fockis and create your profile.
            </p>

          </div>

          <form onSubmit={submit}>

            {/* ============================================================ */}
            {/* FIRST + LAST NAME */}
            {/* ============================================================ */}

            <div className="field-row">

              <div className="field">

                <label htmlFor="firstName">
                  First name
                </label>

                <div className="input-shell">

                  <input
                    id="firstName"
                    autoFocus
                    type="text"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) =>
                      setFirstName(
                        e.target.value,
                      )
                    }
                    autoComplete="given-name"
                    disabled={loading}
                    required
                  />

                </div>
              </div>

              <div className="field">

                <label htmlFor="lastName">
                  Last name
                </label>

                <div className="input-shell">

                  <input
                    id="lastName"
                    type="text"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) =>
                      setLastName(
                        e.target.value,
                      )
                    }
                    autoComplete="family-name"
                    disabled={loading}
                    required
                  />

                </div>
              </div>

            </div>

            {/* ============================================================ */}
            {/* USERNAME */}
            {/* ============================================================ */}

            <div className="field">

              <label htmlFor="username">
                Username
              </label>

              <div className="input-shell">

                <span
                  className="input-shell__icon"
                  aria-hidden="true"
                >
                  <IconUser />
                </span>

                <input
                  id="username"
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value,
                    )
                  }
                  autoComplete="username"
                  disabled={loading}
                  required
                />

              </div>
            </div>

            {/* ============================================================ */}
            {/* EMAIL */}
            {/* ============================================================ */}

            <div className="field">

              <label htmlFor="email">
                Email
              </label>

              <div className="input-shell">

                <span
                  className="input-shell__icon"
                  aria-hidden="true"
                >
                  <IconMail />
                </span>

                <input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value,
                    )
                  }
                  autoComplete="email"
                  disabled={loading}
                  required
                />

              </div>
            </div>

            {/* ============================================================ */}
            {/* COUNTRY */}
            {/* ============================================================ */}

            <div className="field">

              <label htmlFor="countrySearch">
                Country
                <span
                  aria-hidden="true"
                  style={{
                    marginLeft: "4px",
                  }}
                >
                  *
                </span>
              </label>

              {/* ========================================================== */}
              {/* COUNTRY SEARCH BAR */}
              {/* ========================================================== */}

              <div
                className="input-shell"
                style={{
                  marginBottom: "8px",
                }}
              >

                <span
                  className="input-shell__icon"
                  aria-hidden="true"
                >
                  <IconSearch />
                </span>

                <input
                  id="countrySearch"
                  type="search"
                  placeholder="Search country..."
                  value={countrySearch}
                  onChange={(e) =>
                    setCountrySearch(
                      e.target.value,
                    )
                  }
                  disabled={loading}
                  autoComplete="off"
                  aria-label="Search countries"
                />

                {countrySearch && (
                  <button
                    type="button"
                    onClick={() =>
                      setCountrySearch("")
                    }
                    disabled={loading}
                    aria-label="Clear country search"
                    style={{
                      border: 0,
                      background: "transparent",
                      cursor: "pointer",
                      padding: "4px 8px",
                      fontSize: "18px",
                    }}
                  >
                    ×
                  </button>
                )}

              </div>

              {/* ========================================================== */}
              {/* COUNTRY SELECT */}
              {/* ========================================================== */}

              <div className="input-shell">

                <span
                  className="input-shell__icon"
                  aria-hidden="true"
                >
                  <IconGlobe />
                </span>

                <select
                  id="countryCode"
                  value={countryCode}
                  onChange={(e) =>
                    handleCountrySelect(
                      e.target.value,
                    )
                  }
                  disabled={loading}
                  required
                  aria-required="true"
                >

                  <option value="">
                    {countrySearch
                      ? "Select a matching country"
                      : "Select your country"}
                  </option>

                  {filteredCountries.map(
                    (country) => (
                      <option
                        key={country.code}
                        value={country.code}
                      >
                        {country.flag}{" "}
                        {country.name} (
                        {country.callingCode})
                      </option>
                    ),
                  )}

                </select>

              </div>

              {/* ========================================================== */}
              {/* SEARCH RESULT COUNT */}
              {/* ========================================================== */}

              {countrySearch && (
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "12px",
                    opacity: 0.65,
                  }}
                >
                  {filteredCountries.length}{" "}
                  {filteredCountries.length === 1
                    ? "country"
                    : "countries"}{" "}
                  found
                </div>
              )}

              {/* ========================================================== */}
              {/* CALLING CODE PREVIEW */}
              {/* ========================================================== */}

              {selectedCountry && (
                <div
                  className="country-preview"
                  style={{
                    marginTop: "8px",
                    fontSize: "13px",
                    opacity: 0.8,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >

                  <span>
                    {selectedCountry.flag}{" "}
                    {selectedCountry.name}
                  </span>

                  <span
                    style={{
                      fontWeight: 600,
                    }}
                  >
                    Calling code:{" "}
                    {selectedCountry.callingCode}
                  </span>

                </div>
              )}

            </div>

            {/* ============================================================ */}
            {/* PASSWORD */}
            {/* ============================================================ */}

            <div className="field">

              <label htmlFor="password">
                Password
              </label>

              <div className="input-shell">

                <span
                  className="input-shell__icon"
                  aria-hidden="true"
                >
                  <IconLock />
                </span>

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Password"
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value,
                    )
                  }
                  autoComplete="new-password"
                  disabled={loading}
                  required
                  minLength={12}
                />

                <button
                  type="button"
                  className="toggle-visibility"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  onClick={() =>
                    setShowPassword(
                      (value) => !value,
                    )
                  }
                  disabled={loading}
                >
                  {showPassword ? (
                    <IconEyeOff />
                  ) : (
                    <IconEye />
                  )}
                </button>

              </div>

              <div
                style={{
                  marginTop: "6px",
                  fontSize: "12px",
                  opacity: 0.65,
                }}
              >
                At least 12 characters with
                uppercase, lowercase, number,
                and special character.
              </div>

            </div>

            {/* ============================================================ */}
            {/* CONFIRM PASSWORD */}
            {/* ============================================================ */}

            <div className="field">

              <label htmlFor="confirmPassword">
                Confirm password
              </label>

              <div className="input-shell">

                <span
                  className="input-shell__icon"
                  aria-hidden="true"
                >
                  <IconLock />
                </span>

                <input
                  id="confirmPassword"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value,
                    )
                  }
                  autoComplete="new-password"
                  disabled={loading}
                  required
                  minLength={12}
                />

                <button
                  type="button"
                  className="toggle-visibility"
                  aria-label={
                    showConfirmPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  onClick={() =>
                    setShowConfirmPassword(
                      (value) => !value,
                    )
                  }
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <IconEyeOff />
                  ) : (
                    <IconEye />
                  )}
                </button>

              </div>

            </div>

            {/* ============================================================ */}
            {/* FOCKIS ID INFORMATION */}
            {/* ============================================================ */}

            {selectedCountry && (
              <div
                className="fockis-id-registration-note"
                style={{
                  marginBottom: "16px",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background:
                    "rgba(255, 153, 0, 0.08)",
                  border:
                    "1px solid rgba(255, 153, 0, 0.2)",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >

                <strong>
                  Your Fockis identity
                </strong>

                <div>
                  Your country will be connected
                  to your Fockis ID.
                </div>

                <div>
                  Example:{" "}
                  <strong>
                    {selectedCountry.callingCode}
                    -FK7H2K9A
                  </strong>
                </div>

                <div
                  style={{
                    marginTop: "4px",
                    opacity: 0.75,
                  }}
                >
                  You do not need a phone number
                  to create your Fockis ID.
                </div>

              </div>
            )}

            {/* ============================================================ */}
            {/* SUBMIT */}
            {/* ============================================================ */}

            <button
              type="submit"
              className={`btn-primary${
                loading
                  ? " is-loading"
                  : ""
              }`}
              disabled={loading}
            >

              <span className="spinner" />

              <span className="btn-label">
                Create Account
              </span>

              <span className="loading-label">
                Creating Account...
              </span>

            </button>

          </form>

          {/* ================================================================ */}
          {/* LOGIN */}
          {/* ================================================================ */}

          <p className="login-link">

            Already have an account?{" "}

            <Link to="/login">
              Login
            </Link>

          </p>

        </div>

      </div>

    </div>
  );
}

// ============================================================================
// INLINE ICONS
// ============================================================================

function IconSearch() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
      />

      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />

      <circle
        cx="12"
        cy="7"
        r="4"
      />
    </svg>
  );
}

function IconMail() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="4"
        width="20"
        height="16"
        rx="2"
      />

      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
      />

      <line
        x1="2"
        y1="12"
        x2="22"
        y2="12"
      />

      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2Z" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="11"
        width="18"
        height="11"
        rx="2"
      />

      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />

      <circle
        cx="12"
        cy="12"
        r="3"
      />
    </svg>
  );
}

function IconEyeOff() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-6.5 0-10-7-10-7a18.6 18.6 0 0 1 4.22-5.06" />

      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c6.5 0 10 7 10 7a18.6 18.6 0 0 1-2.16 3.19" />

      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />

      <line
        x1="2"
        y1="2"
        x2="22"
        y2="22"
      />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />

      <circle
        cx="9"
        cy="7"
        r="4"
      />

      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />

      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconStore() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />

      <path d="M3 6h18" />

      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />

      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />

      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="7"
        width="20"
        height="14"
        rx="2"
      />

      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function IconCap() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 10 12 5 2 10l10 5 10-5Z" />

      <path d="M6 12v5c0 1.5 2.5 3 6 3s6-1.5 6-3v-5" />
    </svg>
  );
}