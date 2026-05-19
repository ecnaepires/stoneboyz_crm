@echo off
cd /d "C:\Users\Lenovo 02\Documents\ESP\Programing\stoneboyz_crm\stoneboyz_crm\apps\api"
node --env-file=.env dist/main.js >> "C:\Users\Lenovo 02\Documents\ESP\Programing\stoneboyz_crm\stoneboyz_crm\api-direct.log" 2>&1

