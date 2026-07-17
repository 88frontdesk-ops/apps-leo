Set wsc = CreateObject("WScript.Shell")

Do
    If IsAllowedTime() Then
        ' Toggle Caps Lock twice (no visible change)
        wsc.SendKeys "{CAPSLOCK}"
        wsc.SendKeys "{CAPSLOCK}"
    End If

    ' Wait 10 minutes before checking again
    WScript.Sleep 10 * 60 * 1000
Loop

Function IsAllowedTime()

    Dim d, mins

    ' Weekday():
    ' 1 = Sunday
    ' 2 = Monday
    ' 3 = Tuesday
    ' 4 = Wednesday
    ' 5 = Thursday
    ' 6 = Friday
    ' 7 = Saturday

    d = Weekday(Date)

    ' Minutes since midnight
    mins = Hour(Time) * 60 + Minute(Time)

    IsAllowedTime = False

    Select Case d

        ' Wednesday 18:10 PM onwards
        Case 4
            If mins >= (18 * 60 + 10) Then
                IsAllowedTime = True
            End If

        ' Thursday 12:00 AM - 7:10 AM
        '      and 18:10 PM onwards
        Case 5
            If mins < (7 * 60 + 10) _
               Or mins >= (18 * 60 + 10) Then
                IsAllowedTime = True
            End If

        ' Friday 12:00 AM - 7:10 AM
        ' Case 6
        '     If mins < (7 * 60 + 10) Then
        '         IsAllowedTime = True
        '     End If

        ' Friday 12:00 AM - 7:10 AM OR 3:00 PM - 11:00 PM
        Case 6
            If mins < (7 * 60 + 10) _
               Or (mins >= (16 * 60) And mins <= (21 * 60)) Then
                IsAllowedTime = True
            End If

        ' Saturday 6:10 AM - 15:10 PM
        Case 7
            If mins >= (6 * 60 + 10) _
               And mins < (15 * 60 + 10) Then
                IsAllowedTime = True
            End If

        ' Sunday 6:10 AM - 15:10 PM
        Case 1
            If mins >= (6 * 60 + 10) _
               And mins < (15 * 60 + 10) Then
                IsAllowedTime = True
            End If

    End Select

End Function