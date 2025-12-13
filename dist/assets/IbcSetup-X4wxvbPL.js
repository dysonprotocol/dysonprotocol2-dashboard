import{ai as Q,d as oe,r as U,q as B,v as d,K as ie,c as f,a as s,b as l,T as _,i as q,e as o,j as i,k as a,l as t,U as j,z as D,bT as O,bU as G,bV as K,G as y,aE as E,F as re,D as ue,o as r}from"./index-_0VltMeZ.js";import{_ as I,a as S}from"./CardContent.vue_vue_type_script_setup_true_lang-CfcwvGQT.js";import{_ as W}from"./CardDescription.vue_vue_type_script_setup_true_lang-DW_3Ewdh.js";import{_ as N,a as T}from"./CardTitle.vue_vue_type_script_setup_true_lang-XQb8qE3G.js";import{_ as de,a as ce}from"./index-DZ8SXiSz.js";import{_ as me}from"./AlertTitle.vue_vue_type_script_setup_true_lang-DK6FJJp6.js";import{_ as fe,a as _e,b as X,c as C,d as pe,e as h}from"./TableHeader.vue_vue_type_script_setup_true_lang-Tl_iePGA.js";import{a as R,b as A,R as ve,C as ge}from"./refresh-cw-R7ZJFkDz.js";import{C as xe}from"./copy-CredFtew.js";import{C as ye}from"./check-Cb2-loRq.js";/**
 * @license lucide-vue-next v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y=Q("circle",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]]);/**
 * @license lucide-vue-next v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ce=Q("file-code",[["path",{d:"M10 12.5 8 15l2 2.5",key:"1tg20x"}],["path",{d:"m14 12.5 2 2.5-2 2.5",key:"yinavb"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z",key:"1mlx9k"}]]),he={class:"container mx-auto max-w-4xl p-6 space-y-6"},be={class:"grid gap-4 md:grid-cols-3"},ke={key:0,class:"space-y-1 text-sm"},Ie={key:1,class:"text-sm text-muted-foreground"},Se={key:0,class:"space-y-1 text-sm"},Ne={key:1,class:"text-sm text-muted-foreground"},Te={key:0,class:"space-y-1 text-sm"},$e={key:1,class:"text-sm text-muted-foreground"},we={key:0},ze={key:1},De={class:"relative"},Re={class:"mt-6"},Be={class:"mt-2 space-y-2 text-xs font-mono"},Oe={class:"bg-muted p-2 rounded overflow-auto max-h-32"},Ee={class:"bg-muted p-2 rounded overflow-auto max-h-32"},Ae={class:"bg-muted p-2 rounded overflow-auto max-h-32"},Me={class:"mt-6"},Fe={class:"cursor-pointer text-sm text-muted-foreground hover:text-foreground"},Ve={class:"mt-2 overflow-auto"},p="dyson-mainnet-01",J="dys2-mainnet-1",Qe=oe({__name:"IbcSetup",setup(He){const M=`[global]
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
id = "${p}"
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
id = "${J}"
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
`,$=U(!1),w=U(!1);async function Z(){await navigator.clipboard.writeText(M),w.value=!0,setTimeout(()=>{w.value=!1},2e3)}const ee=B(O),te=B(G),ne=B(K),g=d(()=>ee.all()),b=d(()=>te.all()),k=d(()=>ne.all()),c=d(()=>{const u=new Set(g.value.filter(n=>n.remote_chain_id===p).map(n=>n.client_id)),e=new Set(b.value.filter(n=>u.has(n.client_id)&&(n.state==="STATE_OPEN"||n.state==="OPEN")).map(n=>n.id));return k.value.find(n=>n.port_id==="transfer"&&n.connection_hops?.some(z=>e.has(z))&&(n.state==="STATE_OPEN"||n.state==="OPEN"))}),m=d(()=>{if(!c.value)return null;const u=c.value.connection_hops?.[0];return b.value.find(e=>e.id===u)}),v=d(()=>m.value?g.value.find(u=>u.client_id===m.value.client_id):null),se=d(()=>{const u=new Map(b.value.map(n=>[n.id,n])),e=new Map(g.value.map(n=>[n.client_id,n]));return k.value.map(n=>{const z=n.connection_hops?.[0]||"",P=u.get(z)?.client_id||"",le=e.get(P);return{channel:n,connectionId:z,clientId:P,remoteChainId:le?.remote_chain_id||""}})});function ae(u){return u?.replace("STATE_","")||"—"}const x=d(()=>!!(v.value&&m.value&&c.value)),F=d(()=>v.value?{icon:R,class:"text-green-500"}:{icon:A,class:"text-destructive"}),V=d(()=>m.value?{icon:R,class:"text-green-500"}:v.value?{icon:Y,class:"text-muted-foreground"}:{icon:A,class:"text-destructive"}),H=d(()=>c.value?{icon:R,class:"text-green-500"}:m.value?{icon:Y,class:"text-muted-foreground"}:{icon:A,class:"text-destructive"});async function L(){$.value=!0,await Promise.allSettled([D(O).api().fetchClients(),D(G).api().fetchConnections(),D(K).api().fetchChannels()]);for(const u of g.value)await D(O).api().fetchStatus(u.client_id).catch(()=>{});$.value=!1}return ie(()=>L()),(u,e)=>(r(),f("div",he,[e[29]||(e[29]=s("h1",{class:"text-2xl font-bold"},"IBC Channel Setup",-1)),s("p",{class:"text-muted-foreground"},[e[0]||(e[0]=o(" Status of IBC connection to ",-1)),s("code",{class:"font-mono"},i(p))]),l(t(j),{variant:"outline",disabled:$.value,onClick:L},{default:a(()=>[l(t(ve),{class:y(["mr-2 size-4",{"animate-spin":$.value}])},null,8,["class"]),e[1]||(e[1]=o(" Refresh ",-1))]),_:1},8,["disabled"]),s("div",be,[l(t(I),null,{default:a(()=>[l(t(N),{class:"pb-2"},{default:a(()=>[l(t(T),{class:"flex items-center gap-2 text-base"},{default:a(()=>[(r(),_(E(F.value.icon),{class:y([F.value.class,"size-5"])},null,8,["class"])),e[2]||(e[2]=o(" Client ",-1))]),_:1})]),_:1}),l(t(S),null,{default:a(()=>[v.value?(r(),f("div",ke,[s("div",null,[e[3]||(e[3]=s("span",{class:"text-muted-foreground"},"ID:",-1)),o(" "+i(v.value.client_id),1)]),s("div",null,[e[4]||(e[4]=s("span",{class:"text-muted-foreground"},"Status:",-1)),o(" "+i(v.value.status||"—"),1)])])):(r(),f("div",Ie," No client found for "+i(p)))]),_:1})]),_:1}),l(t(I),null,{default:a(()=>[l(t(N),{class:"pb-2"},{default:a(()=>[l(t(T),{class:"flex items-center gap-2 text-base"},{default:a(()=>[(r(),_(E(V.value.icon),{class:y([V.value.class,"size-5"])},null,8,["class"])),e[5]||(e[5]=o(" Connection ",-1))]),_:1})]),_:1}),l(t(S),null,{default:a(()=>[m.value?(r(),f("div",Se,[s("div",null,[e[6]||(e[6]=s("span",{class:"text-muted-foreground"},"ID:",-1)),o(" "+i(m.value.id),1)]),s("div",null,[e[7]||(e[7]=s("span",{class:"text-muted-foreground"},"State:",-1)),o(" "+i(m.value.state),1)])])):(r(),f("div",Ne,"No connection found"))]),_:1})]),_:1}),l(t(I),null,{default:a(()=>[l(t(N),{class:"pb-2"},{default:a(()=>[l(t(T),{class:"flex items-center gap-2 text-base"},{default:a(()=>[(r(),_(E(H.value.icon),{class:y([H.value.class,"size-5"])},null,8,["class"])),e[8]||(e[8]=o(" Transfer Channel ",-1))]),_:1})]),_:1}),l(t(S),null,{default:a(()=>[c.value?(r(),f("div",Te,[s("div",null,[e[9]||(e[9]=s("span",{class:"text-muted-foreground"},"Local:",-1)),o(" "+i(c.value.channel_id),1)]),s("div",null,[e[10]||(e[10]=s("span",{class:"text-muted-foreground"},"Remote:",-1)),o(" "+i(c.value.counterparty_channel_id),1)]),s("div",null,[e[11]||(e[11]=s("span",{class:"text-muted-foreground"},"State:",-1)),o(" "+i(c.value.state),1)])])):(r(),f("div",$e,"No transfer channel found"))]),_:1})]),_:1})]),l(t(de),{variant:x.value?"default":"destructive"},{default:a(()=>[x.value?(r(),_(t(R),{key:0,class:"size-4"})):(r(),_(t(ge),{key:1,class:"size-4"})),l(t(me),null,{default:a(()=>[o(i(x.value?"Ready":"Not Ready"),1)]),_:1}),l(t(ce),null,{default:a(()=>[x.value?(r(),f("span",we," IBC channel is configured. You can proceed with migrations. ")):(r(),f("span",ze,[e[12]||(e[12]=o(" IBC channel to ",-1)),s("code",null,i(p)),e[13]||(e[13]=o(" is not fully set up. See the steps below. ",-1))]))]),_:1})]),_:1},8,["variant"]),x.value?q("",!0):(r(),_(t(I),{key:0},{default:a(()=>[l(t(N),null,{default:a(()=>[l(t(T),null,{default:a(()=>[...e[14]||(e[14]=[o("Create IBC Channel",-1)])]),_:1}),l(t(W),null,{default:a(()=>[...e[15]||(e[15]=[o(" Run this single command to create the client, connection, and channel all at once. ",-1)])]),_:1})]),_:1}),l(t(S),null,{default:a(()=>[s("pre",{class:"bg-muted p-3 rounded text-xs overflow-auto whitespace-pre-wrap"},`hermes create channel \\
  --a-chain `+i(J)+` \\
  --b-chain `+i(p)+` \\
  --a-port transfer \\
  --b-port transfer \\
  --new-client-connection \\
  --yes`)]),_:1})]),_:1})),x.value?q("",!0):(r(),_(t(I),{key:1},{default:a(()=>[l(t(N),null,{default:a(()=>[l(t(T),{class:"flex items-center gap-2"},{default:a(()=>[l(t(Ce),{class:"size-5"}),e[16]||(e[16]=o(" Hermes Config ",-1))]),_:1}),l(t(W),null,{default:a(()=>[...e[17]||(e[17]=[o(" Save this as ",-1),s("code",null,"config.toml",-1),o(" in your Hermes directory (~/.hermes/) ",-1)])]),_:1})]),_:1}),l(t(S),null,{default:a(()=>[s("div",De,[l(t(j),{variant:"outline",size:"sm",class:"absolute top-2 right-2",onClick:Z},{default:a(()=>[w.value?(r(),_(t(ye),{key:1,class:"size-4 mr-1"})):(r(),_(t(xe),{key:0,class:"size-4 mr-1"})),o(" "+i(w.value?"Copied!":"Copy"),1)]),_:1}),s("pre",{class:"bg-muted p-4 rounded text-xs overflow-auto max-h-96"},i(M))])]),_:1})]),_:1})),s("details",Re,[e[22]||(e[22]=s("summary",{class:"cursor-pointer text-sm text-muted-foreground hover:text-foreground"}," Debug: Raw Data ",-1)),s("div",Be,[s("div",null,[e[18]||(e[18]=s("strong",null,"Looking for chain:",-1)),o(" "+i(p))]),s("div",null,[s("strong",null,"Clients ("+i(g.value.length)+"):",1),s("pre",Oe,i(g.value.map(n=>({id:n.client_id,chain:n.remote_chain_id}))),1)]),s("div",null,[e[19]||(e[19]=s("strong",null,"Target Client:",-1)),o(" "+i(v.value?.client_id||"NOT FOUND"),1)]),s("div",null,[s("strong",null,"Connections ("+i(b.value.length)+"):",1),s("pre",Ee,i(b.value.map(n=>({id:n.id,client:n.client_id,state:n.state}))),1)]),s("div",null,[e[20]||(e[20]=s("strong",null,"Target Connection:",-1)),o(" "+i(m.value?.id||"NOT FOUND")+" (state: "+i(m.value?.state)+") ",1)]),s("div",null,[s("strong",null,"Channels ("+i(k.value.length)+"):",1),s("pre",Ae,i(k.value.map(n=>({port:n.port_id,ch:n.channel_id,conn:n.connection_hops,state:n.state}))),1)]),s("div",null,[e[21]||(e[21]=s("strong",null,"Target Channel:",-1)),o(" "+i(c.value?.channel_id||"NOT FOUND")+" (state: "+i(c.value?.state)+") ",1)])])]),s("details",Me,[s("summary",Fe," All IBC Channels ("+i(k.value.length)+") ",1),s("div",Ve,[l(t(fe),null,{default:a(()=>[l(t(_e),null,{default:a(()=>[l(t(X),null,{default:a(()=>[l(t(C),null,{default:a(()=>[...e[23]||(e[23]=[o("Channel",-1)])]),_:1}),l(t(C),null,{default:a(()=>[...e[24]||(e[24]=[o("Counterparty",-1)])]),_:1}),l(t(C),null,{default:a(()=>[...e[25]||(e[25]=[o("State",-1)])]),_:1}),l(t(C),null,{default:a(()=>[...e[26]||(e[26]=[o("Connection",-1)])]),_:1}),l(t(C),null,{default:a(()=>[...e[27]||(e[27]=[o("Client",-1)])]),_:1}),l(t(C),null,{default:a(()=>[...e[28]||(e[28]=[o("Remote Chain",-1)])]),_:1})]),_:1})]),_:1}),l(t(pe),null,{default:a(()=>[(r(!0),f(re,null,ue(se.value,n=>(r(),_(t(X),{key:n.channel.port_id+"/"+n.channel.channel_id,class:y({"bg-primary/5":n.remoteChainId===p})},{default:a(()=>[l(t(h),{class:"font-mono text-sm"},{default:a(()=>[o(i(n.channel.port_id)+"/"+i(n.channel.channel_id),1)]),_:2},1024),l(t(h),{class:"font-mono text-sm"},{default:a(()=>[o(i(n.channel.counterparty_port_id)+"/"+i(n.channel.counterparty_channel_id),1)]),_:2},1024),l(t(h),null,{default:a(()=>[o(i(ae(n.channel.state)),1)]),_:2},1024),l(t(h),{class:"font-mono text-sm"},{default:a(()=>[o(i(n.connectionId),1)]),_:2},1024),l(t(h),{class:"font-mono text-sm"},{default:a(()=>[o(i(n.clientId),1)]),_:2},1024),l(t(h),{class:y({"font-semibold text-primary":n.remoteChainId===p})},{default:a(()=>[o(i(n.remoteChainId||"—"),1)]),_:2},1032,["class"])]),_:2},1032,["class"]))),128))]),_:1})]),_:1})])])]))}});export{Qe as default};
