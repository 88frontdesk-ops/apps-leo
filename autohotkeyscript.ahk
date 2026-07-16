F7::SoundSetMute(-1)
F8::Volume_Down
F9::Volume_Up
Pause::Media_Play_Pause

#Requires AutoHotkey v2.0

; Move mouse to the Skip Ad button
F12::
{
    ; Replace these numbers with the ones you got from Window Spy
    MouseMove 800, 600
    Click
}

ScrollLock::
{
    MouseMove 1200, 800
    Click
    MouseMove 400, 10, 0
}
