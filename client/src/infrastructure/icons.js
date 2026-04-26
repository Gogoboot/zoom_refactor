/* ==========================================
   ИКОНКИ — lucide v1.11.0
   Формат: массив [tag, attrs, children]
   ========================================== */
import {
    Mic, MicOff, Video, VideoOff, PhoneOff,
    ArrowLeftRight, MessageCircle, Maximize, Minimize,
    Copy, Check, Settings, LogOut, Plus, LogIn, Send,
    Moon, Sun, Layers,
} from 'lucide';

/* Создаёт SVG из массива данных Lucide */
function icon(data, size = 20) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    data.forEach(([tag, attrs]) => {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
        svg.appendChild(el);
    });

    return svg;
}

export function iconMic()       { return icon(Mic); }
export function iconMicOff()    { return icon(MicOff); }
export function iconVideo()     { return icon(Video); }
export function iconVideoOff()  { return icon(VideoOff); }
export function iconPhoneOff()  { return icon(PhoneOff); }
export function iconSwap()      { return icon(ArrowLeftRight); }
export function iconChat()      { return icon(MessageCircle); }
export function iconMaximize()  { return icon(Maximize); }
export function iconMinimize()  { return icon(Minimize); }
export function iconCopy()      { return icon(Copy); }
export function iconCheck()     { return icon(Check); }
export function iconSettings()  { return icon(Settings); }
export function iconLeave()     { return icon(LogOut); }
export function iconPlus()      { return icon(Plus); }
export function iconJoin()      { return icon(LogIn); }
export function iconSend()      { return icon(Send); }
export function iconMoon()      { return icon(Moon); }
export function iconSun()       { return icon(Sun); }
export function iconLayers()    { return icon(Layers); }
