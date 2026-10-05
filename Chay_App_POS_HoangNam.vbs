Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c node """ & WshShell.CurrentDirectory & "\server.js""", 0, False
Set WshShell = Nothing
