@echo Minifying %~n1 to %~n1.min.js ...@
"C:\Program Files (x86)\Microsoft\Microsoft Ajax Minifier\ajaxmin.exe" -JS "%1" -clobber:true -out "%~p1%~n1-min.js" -enc:in utf-8
