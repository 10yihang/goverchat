Option Explicit

Dim src, dstDocx, dstTxt
If WScript.Arguments.Count < 3 Then
    WScript.Echo "Usage: cscript //nologo convert_with_word.vbs <src> <dstDocx> <dstTxt>"
    WScript.Quit 1
End If

src = WScript.Arguments(0)
dstDocx = WScript.Arguments(1)
dstTxt = WScript.Arguments(2)

Dim word, doc
Set word = CreateObject("Word.Application")
word.Visible = False
word.DisplayAlerts = 0

On Error Resume Next
Set doc = word.Documents.Open(src, False, True)
If Err.Number <> 0 Then
    WScript.Echo "Open failed: " & Err.Description
    word.Quit
    WScript.Quit 2
End If
On Error GoTo 0

doc.SaveAs2 dstDocx, 16
doc.SaveAs2 dstTxt, 2
doc.Close False
word.Quit
