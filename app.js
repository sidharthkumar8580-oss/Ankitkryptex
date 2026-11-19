import * as webllm from "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.85/+esm";

const MODEL = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
const loadBtn = document.querySelector("#loadBtn");
const sendBtn = document.querySelector("#sendBtn");
const promptBox = document.querySelector("#prompt");
const messagesBox = document.querySelector("#messages");
const statusBox = document.querySelector("#status");
const welcome = document.querySelector("#welcome");
let engine = null;
let history = [];

function status(text){ statusBox.textContent = text; }
function addMessage(role, text){
  const empty = messagesBox.querySelector(".empty");
  if(empty) empty.remove();
  const el = document.createElement("div");
  el.className = "bubble " + role;
  el.textContent = text;
  messagesBox.appendChild(el);
  messagesBox.scrollTop = messagesBox.scrollHeight;
  return el;
}

async function loadModel(){
  if(!("gpu" in navigator)){
    status("WebGPU unavailable in this browser/device.");
    addMessage("assistant","This device/browser does not currently provide WebGPU. Try an up-to-date Chrome browser on a supported device. No cloud API fallback is configured.");
    return;
  }
  loadBtn.disabled = true;
  loadBtn.textContent = "Preparing model…";
  status("Checking device support…");
  try{
    engine = await webllm.CreateMLCEngine(MODEL,{
      initProgressCallback:(report)=>{
        const pct = Math.round((report.progress || 0)*100);
        status(report.text || ("Downloading model: "+pct+"%"));
        loadBtn.textContent = pct ? "Downloading… "+pct+"%" : "Loading model…";
      },
      logLevel:"WARN"
    });
    welcome.style.display = "none";
    promptBox.disabled = false;
    sendBtn.disabled = false;
    loadBtn.textContent = "AI ready";
    status("Ready · running on this device");
    addMessage("assistant","Namaste! Main Ankitkryptex hoon. Main is device par locally run kar raha hoon. Aap kya poochna chahenge?");
  }catch(err){
    console.error(err);
    status("Could not load model.");
    loadBtn.disabled = false;
    loadBtn.textContent = "Try loading again";
    addMessage("assistant","Model load nahi ho paya. Ho sakta hai device mein WebGPU ya available graphics memory kam ho. Error: "+(err?.message || "Unknown error"));
  }
}

async function sendMessage(){
  const text = promptBox.value.trim();
  if(!text || !engine) return;
  promptBox.value = "";
  promptBox.disabled = true;
  sendBtn.disabled = true;
  addMessage("user",text);
  history.push({role:"user",content:text});
  const answer = addMessage("assistant","");
  status("Thinking locally…");
  try{
    const stream = await engine.chat.completions.create({
      messages:[
        {role:"system",content:"You are Ankitkryptex, a helpful and honest AI assistant. Reply clearly and naturally. If unsure, say so. Prefer Hindi or Hinglish when the user uses it."},
        ...history.slice(-12)
      ],
      temperature:0.7,
      max_tokens:400,
      stream:true
    });
    let result = "";
    for await(const chunk of stream){
      result += chunk.choices?.[0]?.delta?.content || "";
      answer.textContent = result;
      messagesBox.scrollTop = messagesBox.scrollHeight;
    }
    history.push({role:"assistant",content:result});
    status("Ready · local inference");
  }catch(err){
    console.error(err);
    answer.textContent = "Generation error: "+(err?.message || "Please try again.");
    status("Generation failed");
  }finally{
    promptBox.disabled = false;
    sendBtn.disabled = false;
    promptBox.focus();
  }
}

loadBtn.addEventListener("click",loadModel);
sendBtn.addEventListener("click",sendMessage);
promptBox.addEventListener("keydown",e=>{
  if(e.key==="Enter" && !e.shiftKey){e.preventDefault();sendMessage();}
});
document.querySelector("#clearBtn").addEventListener("click",()=>{
  history=[];
  messagesBox.innerHTML='<div class="empty">Your conversation will appear here.</div>';
});
