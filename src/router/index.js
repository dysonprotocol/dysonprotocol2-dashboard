import { createRouter, createWebHistory } from "vue-router";
import { useAddressStore } from "@/stores/address";

// Lazy-loaded views to reduce initial bundle size
const Home = () => import("@/views/Home.vue");

// Address views
const AddressLayout = () => import("@/views/address/AddressLayout.vue");
const DestinationLayout = () => import("@/views/names/DestinationLayout.vue");
const AddressSummary = () => import("@/views/address/AddressSummary.vue");
const AddressScript = () => import("@/views/address/AddressScript.vue");
const AddressFunction = () => import("@/views/address/AddressFunction.vue");
const AddressNames = () => import("@/views/address/AddressNames.vue");
const AddressCoins = () => import("@/views/address/AddressCoins.vue");
const AddressStorage = () => import("@/views/address/AddressStorage.vue");
const AddressStoragePath = () =>
  import("@/views/address/AddressStoragePath.vue");
const AddressTasks = () => import("@/views/address/AddressTasks.vue");
const AddressStaking = () => import("@/views/address/AddressStaking.vue");
const AddressNFTs = () => import("@/views/address/AddressNFTs.vue");

// Chain explorer views
const NameList = () => import("@/views/chain/NameList.vue");
const NameDetails = () => import("@/views/chain/NameDetails.vue");
const NftClassList = () => import("@/components/nft/NftClassList.vue");
const NftDetail = () => import("@/components/nft/NftDetail.vue");
const ValidatorDetails = () => import("@/views/chain/ValidatorDetails.vue");
const ValidatorsList = () => import("@/views/chain/ValidatorsList.vue");
const GovernanceProposals = () =>
  import("@/views/chain/GovernanceProposals.vue");
const TaskManager = () => import("@/views/chain/TaskManager.vue");
const TaskDetail = () => import("@/views/chain/TaskDetail.vue");

// Block explorer views
const BlocksList = () => import("@/views/explorer/BlocksList.vue");
const BlockDetail = () => import("@/views/explorer/BlockDetail.vue");
const TxDetail = () => import("@/views/explorer/TxDetail.vue");
const TxsList = () => import("@/views/explorer/TxsList.vue");

// API & Learning views
const ApiDocs = () => import("@/views/api/ApiDocs.vue");
const CodeSnippets = () => import("@/views/api/CodeSnippets.vue");

// Wallet management views
const WalletView = () => import("@/views/WalletView.vue");

// Reserved route patterns - these prevent conflicts with address resolution
const RESERVED_ROUTES = [
  "names",
  "nfts",
  "txs",
  "blocks",
  "height",
  "validators",
  "gov",
  "tasks",
  "docs",
  "api",
  "wallet",
  "nftclasses",
];

function isReservedRoute(param) {
  return RESERVED_ROUTES.includes(String(param).toLowerCase());
}

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },

  // General routes (reserved patterns)
  // Backward-compatible redirects from singular to plural
  { path: "/name", redirect: "/names" },
  { path: "/name/:name", redirect: (to) => `/names/${to.params.name}` },
  {
    path: "/names",
    name: "NameList",
    component: NameList,
  },
  {
    path: "/names/:name",
    // handled below under AddressLayout with tabs/header
    // Note: Keep this route definition below (under AddressLayout). Removing here to avoid duplicate path.
    // This placeholder entry was incorrectly redirecting to itself and is removed.
    // Intentionally left blank.
  },
  {
    path: "/nfts/:class",
    redirect: (to) => {
      const cls = String(to.params.class || "");
      const root = cls.split("/")[0] || "";
      return `/names/${encodeURIComponent(root)}/nfts/${encodeURIComponent(
        cls
      )}`;
    },
  },
  {
    path: "/nfts/:class/:id",
    redirect: (to) => {
      const cls = String(to.params.class || "");
      const id = String(to.params.id || "");
      const root = cls.split("/")[0] || "";
      return `/names/${encodeURIComponent(root)}/nfts/${encodeURIComponent(
        cls
      )}/${encodeURIComponent(id)}`;
    },
  },
  // Legacy /nftclasses routes → redirect into /names/:name/nfts tree
  {
    path: "/nftclasses/:class",
    redirect: (to) => {
      const cls = String(to.params.class || "");
      const root = cls.split("/")[0] || "";
      return `/names/${encodeURIComponent(root)}/nfts/${encodeURIComponent(
        cls
      )}`;
    },
  },
  {
    path: "/nftclasses/:class/:id",
    redirect: (to) => {
      const cls = String(to.params.class || "");
      const id = String(to.params.id || "");
      const root = cls.split("/")[0] || "";
      return `/names/${encodeURIComponent(root)}/nfts/${encodeURIComponent(
        cls
      )}/${encodeURIComponent(id)}`;
    },
  },
  {
    path: "/blocks",
    name: "BlocksList",
    component: BlocksList,
  },
  {
    path: "/block/:height(\\d+)",
    name: "BlockDetail",
    component: BlockDetail,
    props: true,
  },
  {
    path: "/txs",
    name: "TxsList",
    component: TxsList,
  },
  {
    path: "/txs/:hash",
    name: "TransactionDetails",
    component: TxDetail,
    props: true,
  },
  {
    path: "/validators",
    name: "ValidatorsList",
    component: ValidatorsList,
  },
  {
    path: "/validators/:valAddress",
    name: "ValidatorDetails",
    component: ValidatorDetails,
    props: true,
  },
  {
    path: "/gov/:proposalId(\\d+)",
    name: "GovernanceProposal",
    component: GovernanceProposals,
    props: true,
  },
  {
    path: "/tasks",
    name: "TaskManager",
    component: TaskManager,
  },
  {
    path: "/tasks/:taskId",
    name: "TaskDetails",
    component: TaskDetail,
    props: true,
  },
  {
    path: "/docs",
    name: "ApiDocs",
    component: ApiDocs,
  },
  {
    path: "/api",
    name: "CodeSnippets",
    component: CodeSnippets,
  },
  {
    path: "/wallet",
    name: "WalletView",
    component: WalletView,
  },

  // Address-specific routes
  {
    path: "/address/:address",
    component: AddressLayout,
    props: true,
    children: [
      {
        path: "",
        name: "AddressSummary",
        component: AddressSummary,
        props: true,
      },
      {
        path: "script",
        name: "AddressScript",
        component: AddressScript,
        props: true,
      },
      {
        path: "script/:functionName",
        name: "AddressFunction",
        component: AddressFunction,
        props: true,
      },
      {
        path: "names",
        name: "AddressNames",
        component: AddressNames,
        props: true,
      },
      {
        path: "coins",
        name: "AddressCoins",
        component: AddressCoins,
        props: true,
      },
      {
        path: "storage",
        name: "AddressStorage",
        component: AddressStorage,
        props: true,
      },
      {
        path: "storage/:pathMatch(.*)",
        name: "AddressStoragePath",
        component: AddressStoragePath,
        props: true,
      },
      {
        path: "tasks",
        name: "AddressTasks",
        component: AddressTasks,
        props: true,
      },
      {
        path: "staking",
        name: "AddressStaking",
        component: AddressStaking,
        props: true,
      },
      {
        path: "nfts",
        name: "AddressNFTs",
        component: AddressNFTs,
        props: true,
      },
    ],
  },

  // Name-specific routes (pretty URLs that resolve to an address)
  {
    path: "/names/:name",
    component: DestinationLayout,
    props: true,
    children: [
      {
        path: "",
        name: "NameDetailsViaNames",
        component: NameDetails,
        props: true,
      },
      {
        path: "nfts",
        name: "NameNFTClasses",
        component: NftClassList,
        props: true,
      },
      {
        path: "nfts/:class",
        name: "NameNFTClass",
        component: () => import("@/components/nft/NftClassDetails.vue"),
        props: true,
      },
      {
        path: "nfts/:class/:id",
        name: "NameNFTDetail",
        component: NftDetail,
        props: true,
      },
      {
        path: "destination/script",
        name: "NameScript",
        component: AddressScript,
        props: true,
      },
      {
        path: "destination/script/:functionName",
        name: "NameFunction",
        component: AddressFunction,
        props: true,
      },
      {
        path: "destination/names",
        name: "NameNames",
        component: AddressNames,
        props: true,
      },
      {
        path: "destination/coins",
        name: "NameCoins",
        component: AddressCoins,
        props: true,
      },
      {
        path: "destination/storage",
        name: "NameStorage",
        component: AddressStorage,
        props: true,
      },
      {
        path: "destination/storage/:pathMatch(.*)",
        name: "NameStoragePath",
        component: AddressStoragePath,
        props: true,
      },
      {
        path: "destination/tasks",
        name: "NameTasks",
        component: AddressTasks,
        props: true,
      },
      {
        path: "destination/staking",
        name: "NameStaking",
        component: AddressStaking,
        props: true,
      },
      {
        path: "destination/nfts",
        name: "NameNFTs",
        component: AddressNFTs,
        props: true,
      },
      {
        path: "denoms",
        name: "NameDenoms",
        component: () => import("@/views/chain/NameDenoms.vue"),
        props: true,
      },
      {
        path: "denoms/:denom",
        name: "NameDenomDetail",
        component: () => import("@/views/chain/NameDenomDetail.vue"),
        props: true,
      },
      {
        path: "denoms/:denom/owners",
        name: "NameDenomOwners",
        component: () => import("@/views/chain/NameDenomOwners.vue"),
        props: true,
      },
    ],
  },

  // 404 route
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/views/NotFound.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Global navigation guard centralizes address/name validation
router.beforeEach(async (to, from, next) => {
  // Normalize path: collapse duplicate slashes and remove trailing slash (except root)
  if (to.path !== "/") {
    const collapsed = to.path.replace(/\/+/, "/");
    const normalized = collapsed.replace(/(.+?)\/+$/, "$1");
    if (normalized !== to.path) {
      return next({
        path: normalized,
        query: to.query,
        hash: to.hash,
        replace: true,
      });
    }
  }

  if (to.path.startsWith("/address/")) {
    const addressParam = to.params.address;
    if (!addressParam || isReservedRoute(addressParam)) return next("/404");

    try {
      const store = useAddressStore();
      const resolved = await store.resolveAddressOrName(addressParam);
      if (!resolved) return next("/404");
      to.meta.resolvedAddress = resolved;
    } catch (e) {
      console.error("Address resolution failed:", e);
      return next("/404");
    }
  }
  if (to.path.startsWith("/names/")) {
    const nameParam = to.params.name;
    if (!nameParam) return next("/404");

    try {
      const store = useAddressStore();
      const resolved = await store.resolveAddressOrName(nameParam);
      // if (!resolved) return next("/404");
      to.meta.resolvedAddress = resolved;
    } catch (e) {
      console.error("Name resolution failed:", e);
      return next("/404");
    }
  }
  next();
});

export default router;
