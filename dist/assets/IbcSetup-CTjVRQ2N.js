import{c as A,d as oe,g as j,E as D,m as d,h as ie,a as f,b as s,j as l,i as _,e as q,k as o,f as i,w as a,u as t,l as W,I as R,bL as O,bM as X,bN as Y,n as y,a2 as E,F as re,r as ue,o as r}from"./index-DTZ6ChV-.js";import{_ as I,a as N}from"./CardContent.vue_vue_type_script_setup_true_lang-DhLchadR.js";import{_ as G}from"./CardDescription.vue_vue_type_script_setup_true_lang-B3s9Ea7v.js";import{a as S,_ as w}from"./CardTitle.vue_vue_type_script_setup_true_lang-B7MQiPIm.js";import{_ as de,a as ce}from"./index-CavSiN4q.js";import{_ as me}from"./AlertTitle.vue_vue_type_script_setup_true_lang-mM5HiCzD.js";import{_ as fe,a as _e,b as J,c as h,d as pe,e as C}from"./TableHeader.vue_vue_type_script_setup_true_lang-DYAINyNY.js";import{a as B,b as M,R as ve,C as ge}from"./refresh-cw-CmPrjVPX.js";import{C as xe}from"./check-CA23BybS.js";/**
 * @license lucide-vue-next v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K=A("circle",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]]);/**
 * @license lucide-vue-next v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ye=A("copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);/**
 * @license lucide-vue-next v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const he=A("file-code",[["path",{d:"M10 12.5 8 15l2 2.5",key:"1tg20x"}],["path",{d:"m14 12.5 2 2.5-2 2.5",key:"yinavb"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z",key:"1mlx9k"}]]),Ce={class:"container mx-auto max-w-4xl p-6 space-y-6"},be={class:"grid gap-4 md:grid-cols-3"},ke={key:0,class:"space-y-1 text-sm"},Ie={key:1,class:"text-sm text-muted-foreground"},Ne={key:0,class:"space-y-1 text-sm"},Se={key:1,class:"text-sm text-muted-foreground"},we={key:0,class:"space-y-1 text-sm"},$e={key:1,class:"text-sm text-muted-foreground"},Te={key:0},ze={key:1},Re={class:"relative"},Be={class:"mt-6"},De={class:"mt-2 space-y-2 text-xs font-mono"},Oe={class:"bg-muted p-2 rounded overflow-auto max-h-32"},Ee={class:"bg-muted p-2 rounded overflow-auto max-h-32"},Me={class:"bg-muted p-2 rounded overflow-auto max-h-32"},Ae={class:"mt-6"},Fe={class:"cursor-pointer text-sm text-muted-foreground hover:text-foreground"},Le={class:"mt-2 overflow-auto"},p="dyson-mainnet-01",Q="dys2-mainnet-1",Ke=oe({__name:"IbcSetup",setup(Ve){const F=`[global]
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
id = "${Q}"
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
`,$=j(!1),T=j(!1);async function Z(){await navigator.clipboard.writeText(F),T.value=!0,setTimeout(()=>{T.value=!1},2e3)}const ee=D(O),te=D(X),ne=D(Y),g=d(()=>ee.all()),b=d(()=>te.all()),k=d(()=>ne.all()),c=d(()=>{const u=new Set(g.value.filter(n=>n.remote_chain_id===p).map(n=>n.client_id)),e=new Set(b.value.filter(n=>u.has(n.client_id)&&(n.state==="STATE_OPEN"||n.state==="OPEN")).map(n=>n.id));return k.value.find(n=>n.port_id==="transfer"&&n.connection_hops?.some(z=>e.has(z))&&(n.state==="STATE_OPEN"||n.state==="OPEN"))}),m=d(()=>{if(!c.value)return null;const u=c.value.connection_hops?.[0];return b.value.find(e=>e.id===u)}),v=d(()=>m.value?g.value.find(u=>u.client_id===m.value.client_id):null),se=d(()=>{const u=new Map(b.value.map(n=>[n.id,n])),e=new Map(g.value.map(n=>[n.client_id,n]));return k.value.map(n=>{const z=n.connection_hops?.[0]||"",U=u.get(z)?.client_id||"",le=e.get(U);return{channel:n,connectionId:z,clientId:U,remoteChainId:le?.remote_chain_id||""}})});function ae(u){return u?.replace("STATE_","")||"—"}const x=d(()=>!!(v.value&&m.value&&c.value)),L=d(()=>v.value?{icon:B,class:"text-green-500"}:{icon:M,class:"text-destructive"}),V=d(()=>m.value?{icon:B,class:"text-green-500"}:v.value?{icon:K,class:"text-muted-foreground"}:{icon:M,class:"text-destructive"}),H=d(()=>c.value?{icon:B,class:"text-green-500"}:m.value?{icon:K,class:"text-muted-foreground"}:{icon:M,class:"text-destructive"});async function P(){$.value=!0,await Promise.allSettled([R(O).api().fetchClients(),R(X).api().fetchConnections(),R(Y).api().fetchChannels()]);for(const u of g.value)await R(O).api().fetchStatus(u.client_id).catch(()=>{});$.value=!1}return ie(()=>P()),(u,e)=>(r(),f("div",Ce,[e[29]||(e[29]=s("h1",{class:"text-2xl font-bold"},"IBC Channel Setup",-1)),s("p",{class:"text-muted-foreground"},[e[0]||(e[0]=o(" Status of IBC connection to ",-1)),s("code",{class:"font-mono"},i(p))]),l(t(W),{variant:"outline",disabled:$.value,onClick:P},{default:a(()=>[l(t(ve),{class:y(["mr-2 size-4",{"animate-spin":$.value}])},null,8,["class"]),e[1]||(e[1]=o(" Refresh ",-1))]),_:1},8,["disabled"]),s("div",be,[l(t(I),null,{default:a(()=>[l(t(S),{class:"pb-2"},{default:a(()=>[l(t(w),{class:"flex items-center gap-2 text-base"},{default:a(()=>[(r(),_(E(L.value.icon),{class:y([L.value.class,"size-5"])},null,8,["class"])),e[2]||(e[2]=o(" Client ",-1))]),_:1})]),_:1}),l(t(N),null,{default:a(()=>[v.value?(r(),f("div",ke,[s("div",null,[e[3]||(e[3]=s("span",{class:"text-muted-foreground"},"ID:",-1)),o(" "+i(v.value.client_id),1)]),s("div",null,[e[4]||(e[4]=s("span",{class:"text-muted-foreground"},"Status:",-1)),o(" "+i(v.value.status||"—"),1)])])):(r(),f("div",Ie," No client found for "+i(p)))]),_:1})]),_:1}),l(t(I),null,{default:a(()=>[l(t(S),{class:"pb-2"},{default:a(()=>[l(t(w),{class:"flex items-center gap-2 text-base"},{default:a(()=>[(r(),_(E(V.value.icon),{class:y([V.value.class,"size-5"])},null,8,["class"])),e[5]||(e[5]=o(" Connection ",-1))]),_:1})]),_:1}),l(t(N),null,{default:a(()=>[m.value?(r(),f("div",Ne,[s("div",null,[e[6]||(e[6]=s("span",{class:"text-muted-foreground"},"ID:",-1)),o(" "+i(m.value.id),1)]),s("div",null,[e[7]||(e[7]=s("span",{class:"text-muted-foreground"},"State:",-1)),o(" "+i(m.value.state),1)])])):(r(),f("div",Se,"No connection found"))]),_:1})]),_:1}),l(t(I),null,{default:a(()=>[l(t(S),{class:"pb-2"},{default:a(()=>[l(t(w),{class:"flex items-center gap-2 text-base"},{default:a(()=>[(r(),_(E(H.value.icon),{class:y([H.value.class,"size-5"])},null,8,["class"])),e[8]||(e[8]=o(" Transfer Channel ",-1))]),_:1})]),_:1}),l(t(N),null,{default:a(()=>[c.value?(r(),f("div",we,[s("div",null,[e[9]||(e[9]=s("span",{class:"text-muted-foreground"},"Local:",-1)),o(" "+i(c.value.channel_id),1)]),s("div",null,[e[10]||(e[10]=s("span",{class:"text-muted-foreground"},"Remote:",-1)),o(" "+i(c.value.counterparty_channel_id),1)]),s("div",null,[e[11]||(e[11]=s("span",{class:"text-muted-foreground"},"State:",-1)),o(" "+i(c.value.state),1)])])):(r(),f("div",$e,"No transfer channel found"))]),_:1})]),_:1})]),l(t(de),{variant:x.value?"default":"destructive"},{default:a(()=>[x.value?(r(),_(t(B),{key:0,class:"size-4"})):(r(),_(t(ge),{key:1,class:"size-4"})),l(t(me),null,{default:a(()=>[o(i(x.value?"Ready":"Not Ready"),1)]),_:1}),l(t(ce),null,{default:a(()=>[x.value?(r(),f("span",Te," IBC channel is configured. You can proceed with migrations. ")):(r(),f("span",ze,[e[12]||(e[12]=o(" IBC channel to ",-1)),s("code",null,i(p)),e[13]||(e[13]=o(" is not fully set up. See the steps below. ",-1))]))]),_:1})]),_:1},8,["variant"]),x.value?q("",!0):(r(),_(t(I),{key:0},{default:a(()=>[l(t(S),null,{default:a(()=>[l(t(w),null,{default:a(()=>[...e[14]||(e[14]=[o("Create IBC Channel",-1)])]),_:1}),l(t(G),null,{default:a(()=>[...e[15]||(e[15]=[o(" Run this single command to create the client, connection, and channel all at once. ",-1)])]),_:1})]),_:1}),l(t(N),null,{default:a(()=>[s("pre",{class:"bg-muted p-3 rounded text-xs overflow-auto whitespace-pre-wrap"},`hermes create channel \\
  --a-chain `+i(Q)+` \\
  --b-chain `+i(p)+` \\
  --a-port transfer \\
  --b-port transfer \\
  --new-client-connection \\
  --yes`)]),_:1})]),_:1})),x.value?q("",!0):(r(),_(t(I),{key:1},{default:a(()=>[l(t(S),null,{default:a(()=>[l(t(w),{class:"flex items-center gap-2"},{default:a(()=>[l(t(he),{class:"size-5"}),e[16]||(e[16]=o(" Hermes Config ",-1))]),_:1}),l(t(G),null,{default:a(()=>[...e[17]||(e[17]=[o(" Save this as ",-1),s("code",null,"config.toml",-1),o(" in your Hermes directory (~/.hermes/) ",-1)])]),_:1})]),_:1}),l(t(N),null,{default:a(()=>[s("div",Re,[l(t(W),{variant:"outline",size:"sm",class:"absolute top-2 right-2",onClick:Z},{default:a(()=>[T.value?(r(),_(t(xe),{key:1,class:"size-4 mr-1"})):(r(),_(t(ye),{key:0,class:"size-4 mr-1"})),o(" "+i(T.value?"Copied!":"Copy"),1)]),_:1}),s("pre",{class:"bg-muted p-4 rounded text-xs overflow-auto max-h-96"},i(F))])]),_:1})]),_:1})),s("details",Be,[e[22]||(e[22]=s("summary",{class:"cursor-pointer text-sm text-muted-foreground hover:text-foreground"}," Debug: Raw Data ",-1)),s("div",De,[s("div",null,[e[18]||(e[18]=s("strong",null,"Looking for chain:",-1)),o(" "+i(p))]),s("div",null,[s("strong",null,"Clients ("+i(g.value.length)+"):",1),s("pre",Oe,i(g.value.map(n=>({id:n.client_id,chain:n.remote_chain_id}))),1)]),s("div",null,[e[19]||(e[19]=s("strong",null,"Target Client:",-1)),o(" "+i(v.value?.client_id||"NOT FOUND"),1)]),s("div",null,[s("strong",null,"Connections ("+i(b.value.length)+"):",1),s("pre",Ee,i(b.value.map(n=>({id:n.id,client:n.client_id,state:n.state}))),1)]),s("div",null,[e[20]||(e[20]=s("strong",null,"Target Connection:",-1)),o(" "+i(m.value?.id||"NOT FOUND")+" (state: "+i(m.value?.state)+") ",1)]),s("div",null,[s("strong",null,"Channels ("+i(k.value.length)+"):",1),s("pre",Me,i(k.value.map(n=>({port:n.port_id,ch:n.channel_id,conn:n.connection_hops,state:n.state}))),1)]),s("div",null,[e[21]||(e[21]=s("strong",null,"Target Channel:",-1)),o(" "+i(c.value?.channel_id||"NOT FOUND")+" (state: "+i(c.value?.state)+") ",1)])])]),s("details",Ae,[s("summary",Fe," All IBC Channels ("+i(k.value.length)+") ",1),s("div",Le,[l(t(fe),null,{default:a(()=>[l(t(_e),null,{default:a(()=>[l(t(J),null,{default:a(()=>[l(t(h),null,{default:a(()=>[...e[23]||(e[23]=[o("Channel",-1)])]),_:1}),l(t(h),null,{default:a(()=>[...e[24]||(e[24]=[o("Counterparty",-1)])]),_:1}),l(t(h),null,{default:a(()=>[...e[25]||(e[25]=[o("State",-1)])]),_:1}),l(t(h),null,{default:a(()=>[...e[26]||(e[26]=[o("Connection",-1)])]),_:1}),l(t(h),null,{default:a(()=>[...e[27]||(e[27]=[o("Client",-1)])]),_:1}),l(t(h),null,{default:a(()=>[...e[28]||(e[28]=[o("Remote Chain",-1)])]),_:1})]),_:1})]),_:1}),l(t(pe),null,{default:a(()=>[(r(!0),f(re,null,ue(se.value,n=>(r(),_(t(J),{key:n.channel.port_id+"/"+n.channel.channel_id,class:y({"bg-primary/5":n.remoteChainId===p})},{default:a(()=>[l(t(C),{class:"font-mono text-sm"},{default:a(()=>[o(i(n.channel.port_id)+"/"+i(n.channel.channel_id),1)]),_:2},1024),l(t(C),{class:"font-mono text-sm"},{default:a(()=>[o(i(n.channel.counterparty_port_id)+"/"+i(n.channel.counterparty_channel_id),1)]),_:2},1024),l(t(C),null,{default:a(()=>[o(i(ae(n.channel.state)),1)]),_:2},1024),l(t(C),{class:"font-mono text-sm"},{default:a(()=>[o(i(n.connectionId),1)]),_:2},1024),l(t(C),{class:"font-mono text-sm"},{default:a(()=>[o(i(n.clientId),1)]),_:2},1024),l(t(C),{class:y({"font-semibold text-primary":n.remoteChainId===p})},{default:a(()=>[o(i(n.remoteChainId||"—"),1)]),_:2},1032,["class"])]),_:2},1032,["class"]))),128))]),_:1})]),_:1})])])]))}});export{Ke as default};
