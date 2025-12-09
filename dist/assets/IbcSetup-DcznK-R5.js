import{c as B,d as $,g as P,x as H,cA as A,cB as V,cC as j,l as m,h as ee,C as k,B as te,_ as ne,a as f,e as n,b as c,j as l,i as C,k as o,f as r,w as a,o as d,n as g,aO as N,F as ae,r as le}from"./index-CqP_gCJE.js";import{C as oe,a as re}from"./CardContent-CbkNe0Mj.js";import{C as se}from"./CardDescription-C4o1Gosf.js";import{C as ie,a as de}from"./CardTitle-CfDt3l-l.js";import{A as ce,a as ue}from"./index-BU2__T77.js";import{A as me}from"./AlertTitle-172lTqMB.js";import{c as fe,d as Ce,b as _e,T as ge,a as he,e as ye}from"./TableHeader-Cx3Hqep2.js";import{b as I,a as w,C as xe,R as ve}from"./refresh-cw-CYuWIHJ3.js";import{C as be}from"./check-CKedVRk0.js";/**
 * @license lucide-vue-next v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U=B("circle",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]]);/**
 * @license lucide-vue-next v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pe=B("copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);/**
 * @license lucide-vue-next v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Te=B("file-code",[["path",{d:"M10 12.5 8 15l2 2.5",key:"1tg20x"}],["path",{d:"m14 12.5 2 2.5-2 2.5",key:"yinavb"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z",key:"1mlx9k"}]]),R="dyson-mainnet-01",W="dysonprotocol-testnet-2",ke=$({__name:"IbcSetup",setup(q,{expose:t}){t();const S=`[global]
log_level = 'info'

[mode.clients]
enabled = true
refresh = true
misbehaviour = false

[mode.connections]
enabled = true

[mode.channels]
enabled = true

[mode.packets]
enabled = true
clear_interval = 100
clear_on_start = true
tx_confirmation = true

[telemetry]
enabled = false
host = '127.0.0.1'
port = 3001

# Old Chain - dyson-mainnet-01 (unbonding period = 7 days)
[[chains]]
id = "${R}"
type = "CosmosSdk"
rpc_addr = "https://dys-tm.dysonprotocol.com"
grpc_addr = "https://dys-grpc.dysonprotocol.com"
event_source = { mode = "pull", interval = "1s" }
rpc_timeout = "15s"
trusted_node = true
account_prefix = "dys"
key_name = "relayer"
store_prefix = "ibc"
gas_price = { price = 0.001, denom = "dys" }
gas_multiplier = 1.5
default_gas = 500000
max_gas = 5000000
max_msg_num = 30
max_tx_size = 2097152
clock_drift = "60s"
max_block_time = "30s"
trusting_period = "5days"
trust_threshold = { numerator = "2", denominator = "3" }

[chains.packet_filter]
policy = "allow"
list = [["transfer", "*"]]

# New Chain - dysonprotocol
[[chains]]
id = "${W}"
type = "CosmosSdk"
rpc_addr = "http://localhost:26657"
grpc_addr = "http://localhost:9090"
event_source = { mode = "pull", interval = "1s" }
rpc_timeout = "15s"
trusted_node = true
account_prefix = "dys2"
key_name = "relayer"
store_prefix = "ibc"
gas_price = { price = 0.001, denom = "udys" }
gas_multiplier = 1.5
default_gas = 500000
max_gas = 5000000
max_msg_num = 30
max_tx_size = 2097152
clock_drift = "60s"
max_block_time = "30s"
trusting_period = "14days"
trust_threshold = { numerator = "2", denominator = "3" }

[chains.packet_filter]
policy = "allow"
list = [["transfer", "*"]]
`,e=P(!1),v=P(!1);async function O(){await navigator.clipboard.writeText(S),v.value=!0,setTimeout(()=>{v.value=!1},2e3)}const s=H(A),z=H(V),L=H(j),h=m(()=>s.all()),b=m(()=>z.all()),D=m(()=>L.all()),y=m(()=>{const u=new Set(h.value.filter(i=>i.remote_chain_id===R).map(i=>i.client_id)),x=new Set(b.value.filter(i=>u.has(i.client_id)&&(i.state==="STATE_OPEN"||i.state==="OPEN")).map(i=>i.id));return D.value.find(i=>i.port_id==="transfer"&&i.connection_hops?.some(T=>x.has(T))&&(i.state==="STATE_OPEN"||i.state==="OPEN"))}),_=m(()=>{if(!y.value)return null;const u=y.value.connection_hops?.[0];return b.value.find(x=>x.id===u)}),p=m(()=>_.value?h.value.find(u=>u.client_id===_.value.client_id):null),X=m(()=>{const u=new Map(b.value.map(i=>[i.id,i])),x=new Map(h.value.map(i=>[i.client_id,i]));return D.value.map(i=>{const T=i.connection_hops?.[0]||"",F=u.get(T)?.client_id||"",Z=x.get(F);return{channel:i,connectionId:T,clientId:F,remoteChainId:Z?.remote_chain_id||""}})});function Y(u){return u?.replace("STATE_","")||"—"}const G=m(()=>!!(p.value&&_.value&&y.value)),J=m(()=>p.value?{icon:I,class:"text-green-500"}:{icon:w,class:"text-destructive"}),K=m(()=>_.value?{icon:I,class:"text-green-500"}:p.value?{icon:U,class:"text-muted-foreground"}:{icon:w,class:"text-destructive"}),Q=m(()=>y.value?{icon:I,class:"text-green-500"}:_.value?{icon:U,class:"text-muted-foreground"}:{icon:w,class:"text-destructive"});async function E(){e.value=!0,await Promise.allSettled([k(A).api().fetchClients(),k(V).api().fetchConnections(),k(j).api().fetchChannels()]);for(const u of h.value)await k(A).api().fetchStatus(u.client_id).catch(()=>{});e.value=!1}ee(()=>E());const M={OLD_CHAIN_ID:R,NEW_CHAIN_ID:W,hermesConfig:S,loading:e,copied:v,copyConfig:O,repoClients:s,repoConns:z,repoChans:L,clients:h,connections:b,channels:D,targetChannel:y,targetConnection:_,targetClient:p,channelRows:X,formatState:Y,allReady:G,clientStatus:J,connectionStatus:K,channelStatus:Q,refresh:E,get Card(){return re},get CardContent(){return oe},get CardDescription(){return se},get CardHeader(){return de},get CardTitle(){return ie},get Alert(){return ue},get AlertDescription(){return ce},get AlertTitle(){return me},get Button(){return te},get Table(){return ye},get TableBody(){return he},get TableCell(){return ge},get TableHead(){return _e},get TableHeader(){return Ce},get TableRow(){return fe},get RefreshCw(){return ve},get CheckCircle(){return I},get AlertCircle(){return xe},get FileCode(){return Te},get Copy(){return pe},get Check(){return be}};return Object.defineProperty(M,"__isScriptSetup",{enumerable:!1,value:!0}),M}}),Ie={class:"container mx-auto max-w-4xl p-6 space-y-6"},Se={class:"grid gap-4 md:grid-cols-3"},De={key:0,class:"space-y-1 text-sm"},He={key:1,class:"text-sm text-muted-foreground"},Ae={key:0,class:"space-y-1 text-sm"},Ne={key:1,class:"text-sm text-muted-foreground"},we={key:0,class:"space-y-1 text-sm"},Re={key:1,class:"text-sm text-muted-foreground"},Be={key:0},Oe={key:1},ze={class:"relative"},Le={class:"mt-6"},Ee={class:"mt-2 space-y-2 text-xs font-mono"},Me={class:"bg-muted p-2 rounded overflow-auto max-h-32"},Fe={class:"bg-muted p-2 rounded overflow-auto max-h-32"},Pe={class:"bg-muted p-2 rounded overflow-auto max-h-32"},Ve={class:"mt-6"},je={class:"cursor-pointer text-sm text-muted-foreground hover:text-foreground"},Ue={class:"mt-2 overflow-auto"};function We(q,t,S,e,v,O){return d(),f("div",Ie,[t[29]||(t[29]=n("h1",{class:"text-2xl font-bold"},"IBC Channel Setup",-1)),n("p",{class:"text-muted-foreground"},[t[0]||(t[0]=o(" Status of IBC connection to ",-1)),n("code",{class:"font-mono"},r(e.OLD_CHAIN_ID))]),c(" Refresh button "),l(e.Button,{variant:"outline",disabled:e.loading,onClick:e.refresh},{default:a(()=>[l(e.RefreshCw,{class:g(["mr-2 size-4",{"animate-spin":e.loading}])},null,8,["class"]),t[1]||(t[1]=o(" Refresh ",-1))]),_:1},8,["disabled"]),c(" Status Cards "),n("div",Se,[c(" Client "),l(e.Card,null,{default:a(()=>[l(e.CardHeader,{class:"pb-2"},{default:a(()=>[l(e.CardTitle,{class:"flex items-center gap-2 text-base"},{default:a(()=>[(d(),C(N(e.clientStatus.icon),{class:g([e.clientStatus.class,"size-5"])},null,8,["class"])),t[2]||(t[2]=o(" Client ",-1))]),_:1})]),_:1}),l(e.CardContent,null,{default:a(()=>[e.targetClient?(d(),f("div",De,[n("div",null,[t[3]||(t[3]=n("span",{class:"text-muted-foreground"},"ID:",-1)),o(" "+r(e.targetClient.client_id),1)]),n("div",null,[t[4]||(t[4]=n("span",{class:"text-muted-foreground"},"Status:",-1)),o(" "+r(e.targetClient.status||"—"),1)])])):(d(),f("div",He," No client found for "+r(e.OLD_CHAIN_ID)))]),_:1})]),_:1}),c(" Connection "),l(e.Card,null,{default:a(()=>[l(e.CardHeader,{class:"pb-2"},{default:a(()=>[l(e.CardTitle,{class:"flex items-center gap-2 text-base"},{default:a(()=>[(d(),C(N(e.connectionStatus.icon),{class:g([e.connectionStatus.class,"size-5"])},null,8,["class"])),t[5]||(t[5]=o(" Connection ",-1))]),_:1})]),_:1}),l(e.CardContent,null,{default:a(()=>[e.targetConnection?(d(),f("div",Ae,[n("div",null,[t[6]||(t[6]=n("span",{class:"text-muted-foreground"},"ID:",-1)),o(" "+r(e.targetConnection.id),1)]),n("div",null,[t[7]||(t[7]=n("span",{class:"text-muted-foreground"},"State:",-1)),o(" "+r(e.targetConnection.state),1)])])):(d(),f("div",Ne," No connection found "))]),_:1})]),_:1}),c(" Channel "),l(e.Card,null,{default:a(()=>[l(e.CardHeader,{class:"pb-2"},{default:a(()=>[l(e.CardTitle,{class:"flex items-center gap-2 text-base"},{default:a(()=>[(d(),C(N(e.channelStatus.icon),{class:g([e.channelStatus.class,"size-5"])},null,8,["class"])),t[8]||(t[8]=o(" Transfer Channel ",-1))]),_:1})]),_:1}),l(e.CardContent,null,{default:a(()=>[e.targetChannel?(d(),f("div",we,[n("div",null,[t[9]||(t[9]=n("span",{class:"text-muted-foreground"},"Local:",-1)),o(" "+r(e.targetChannel.channel_id),1)]),n("div",null,[t[10]||(t[10]=n("span",{class:"text-muted-foreground"},"Remote:",-1)),o(" "+r(e.targetChannel.counterparty_channel_id),1)]),n("div",null,[t[11]||(t[11]=n("span",{class:"text-muted-foreground"},"State:",-1)),o(" "+r(e.targetChannel.state),1)])])):(d(),f("div",Re," No transfer channel found "))]),_:1})]),_:1})]),c(" Summary "),l(e.Alert,{variant:e.allReady?"default":"destructive"},{default:a(()=>[e.allReady?(d(),C(e.CheckCircle,{key:0,class:"size-4"})):(d(),C(e.AlertCircle,{key:1,class:"size-4"})),l(e.AlertTitle,null,{default:a(()=>[o(r(e.allReady?"Ready":"Not Ready"),1)]),_:1}),l(e.AlertDescription,null,{default:a(()=>[e.allReady?(d(),f("span",Be," IBC channel is configured. You can proceed with migrations. ")):(d(),f("span",Oe,[t[12]||(t[12]=o(" IBC channel to ",-1)),n("code",null,r(e.OLD_CHAIN_ID)),t[13]||(t[13]=o(" is not fully set up. See the steps below. ",-1))]))]),_:1})]),_:1},8,["variant"]),c(" Setup Command "),e.allReady?c("v-if",!0):(d(),C(e.Card,{key:0},{default:a(()=>[l(e.CardHeader,null,{default:a(()=>[l(e.CardTitle,null,{default:a(()=>[...t[14]||(t[14]=[o("Create IBC Channel",-1)])]),_:1}),l(e.CardDescription,null,{default:a(()=>[...t[15]||(t[15]=[o(" Run this single command to create the client, connection, and channel all at once. ",-1)])]),_:1})]),_:1}),l(e.CardContent,null,{default:a(()=>[n("pre",{class:"bg-muted p-3 rounded text-xs overflow-auto whitespace-pre-wrap"},`hermes create channel \\
  --a-chain `+r(e.NEW_CHAIN_ID)+` \\
  --b-chain `+r(e.OLD_CHAIN_ID)+` \\
  --a-port transfer \\
  --b-port transfer \\
  --new-client-connection \\
  --yes`)]),_:1})]),_:1})),c(" Hermes Config "),e.allReady?c("v-if",!0):(d(),C(e.Card,{key:1},{default:a(()=>[l(e.CardHeader,null,{default:a(()=>[l(e.CardTitle,{class:"flex items-center gap-2"},{default:a(()=>[l(e.FileCode,{class:"size-5"}),t[16]||(t[16]=o(" Hermes Config ",-1))]),_:1}),l(e.CardDescription,null,{default:a(()=>[...t[17]||(t[17]=[o(" Save this as ",-1),n("code",null,"config.toml",-1),o(" in your Hermes directory (~/.hermes/) ",-1)])]),_:1})]),_:1}),l(e.CardContent,null,{default:a(()=>[n("div",ze,[l(e.Button,{variant:"outline",size:"sm",class:"absolute top-2 right-2",onClick:e.copyConfig},{default:a(()=>[e.copied?(d(),C(e.Check,{key:1,class:"size-4 mr-1"})):(d(),C(e.Copy,{key:0,class:"size-4 mr-1"})),o(" "+r(e.copied?"Copied!":"Copy"),1)]),_:1}),n("pre",{class:"bg-muted p-4 rounded text-xs overflow-auto max-h-96"},r(e.hermesConfig))])]),_:1})]),_:1})),c(" Debug info "),n("details",Le,[t[22]||(t[22]=n("summary",{class:"cursor-pointer text-sm text-muted-foreground hover:text-foreground"}," Debug: Raw Data ",-1)),n("div",Ee,[n("div",null,[t[18]||(t[18]=n("strong",null,"Looking for chain:",-1)),o(" "+r(e.OLD_CHAIN_ID))]),n("div",null,[n("strong",null,"Clients ("+r(e.clients.length)+"):",1),n("pre",Me,r(e.clients.map(s=>({id:s.client_id,chain:s.remote_chain_id}))),1)]),n("div",null,[t[19]||(t[19]=n("strong",null,"Target Client:",-1)),o(" "+r(e.targetClient?.client_id||"NOT FOUND"),1)]),n("div",null,[n("strong",null,"Connections ("+r(e.connections.length)+"):",1),n("pre",Fe,r(e.connections.map(s=>({id:s.id,client:s.client_id,state:s.state}))),1)]),n("div",null,[t[20]||(t[20]=n("strong",null,"Target Connection:",-1)),o(" "+r(e.targetConnection?.id||"NOT FOUND")+" (state: "+r(e.targetConnection?.state)+") ",1)]),n("div",null,[n("strong",null,"Channels ("+r(e.channels.length)+"):",1),n("pre",Pe,r(e.channels.map(s=>({port:s.port_id,ch:s.channel_id,conn:s.connection_hops,state:s.state}))),1)]),n("div",null,[t[21]||(t[21]=n("strong",null,"Target Channel:",-1)),o(" "+r(e.targetChannel?.channel_id||"NOT FOUND")+" (state: "+r(e.targetChannel?.state)+") ",1)])])]),c(" All Channels with inline connection/client data "),n("details",Ve,[n("summary",je," All IBC Channels ("+r(e.channels.length)+") ",1),n("div",Ue,[l(e.Table,null,{default:a(()=>[l(e.TableHeader,null,{default:a(()=>[l(e.TableRow,null,{default:a(()=>[l(e.TableHead,null,{default:a(()=>[...t[23]||(t[23]=[o("Channel",-1)])]),_:1}),l(e.TableHead,null,{default:a(()=>[...t[24]||(t[24]=[o("Counterparty",-1)])]),_:1}),l(e.TableHead,null,{default:a(()=>[...t[25]||(t[25]=[o("State",-1)])]),_:1}),l(e.TableHead,null,{default:a(()=>[...t[26]||(t[26]=[o("Connection",-1)])]),_:1}),l(e.TableHead,null,{default:a(()=>[...t[27]||(t[27]=[o("Client",-1)])]),_:1}),l(e.TableHead,null,{default:a(()=>[...t[28]||(t[28]=[o("Remote Chain",-1)])]),_:1})]),_:1})]),_:1}),l(e.TableBody,null,{default:a(()=>[(d(!0),f(ae,null,le(e.channelRows,s=>(d(),C(e.TableRow,{key:s.channel.port_id+"/"+s.channel.channel_id,class:g({"bg-primary/5":s.remoteChainId===e.OLD_CHAIN_ID})},{default:a(()=>[l(e.TableCell,{class:"font-mono text-sm"},{default:a(()=>[o(r(s.channel.port_id)+"/"+r(s.channel.channel_id),1)]),_:2},1024),l(e.TableCell,{class:"font-mono text-sm"},{default:a(()=>[o(r(s.channel.counterparty_port_id)+"/"+r(s.channel.counterparty_channel_id),1)]),_:2},1024),l(e.TableCell,null,{default:a(()=>[o(r(e.formatState(s.channel.state)),1)]),_:2},1024),l(e.TableCell,{class:"font-mono text-sm"},{default:a(()=>[o(r(s.connectionId),1)]),_:2},1024),l(e.TableCell,{class:"font-mono text-sm"},{default:a(()=>[o(r(s.clientId),1)]),_:2},1024),l(e.TableCell,{class:g({"font-semibold text-primary":s.remoteChainId===e.OLD_CHAIN_ID})},{default:a(()=>[o(r(s.remoteChainId||"—"),1)]),_:2},1032,["class"])]),_:2},1032,["class"]))),128))]),_:1})]),_:1})])])])}const tt=ne(ke,[["render",We],["__file","/workspaces/dysonprotocol2-dashboard/src/views/migration/IbcSetup.vue"]]);export{tt as default};
