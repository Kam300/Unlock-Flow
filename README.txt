Unlock Flow
Extract ZIP. In chrome://extensions enable Developer mode, select Load unpacked, and choose this folder containing manifest.json.
Keep this folder in place. Use the extension popup controls as needed.

Updating / Обновление:
Archives include the version in their name, for example Unlock-Flow-v1.0.4.zip.
1. In the extension popup, check for updates and click Download Update.
2. Extract the ZIP into this SAME folder, replacing existing files.
3. Open the popup again and click Files replaced — restart. Refresh your Flow tab.
Do not remove the extension or load a second copy. Keep the manifest key unchanged.
If your old version has no restart button, reload its card in chrome://extensions once.

1. В окне расширения проверьте обновления и нажмите «Скачать обновление».
2. Распакуйте ZIP в ЭТУ ЖЕ папку с заменой файлов.
3. Откройте расширение и нажмите «Файлы заменены — перезапустить».
   Обновите вкладку Flow.
Не удаляйте расширение и не загружайте вторую копию.
Если в старой версии нет кнопки перезапуска, один раз нажмите ↻
на карточке расширения в chrome://extensions.

Firefox (128+):
Use Unlock-Flow-Firefox-v<version>.zip.
Temporary: about:debugging#/runtime/this-firefox -> Load Temporary Add-on -> select the ZIP.
Permanent (Developer Edition / Nightly / ESR): about:config -> xpinstall.signatures.required = false,
then about:addons -> gear -> Install Add-on From File -> select the ZIP.
The in-popup updater is hidden in Firefox: download new versions from GitHub manually.

Firefox (128+):
Используйте Unlock-Flow-Firefox-v<версия>.zip.
Временно: about:debugging#/runtime/this-firefox -> «Загрузить временное дополнение…» -> выбрать ZIP.
Постоянно (Developer Edition / Nightly / ESR): about:config -> xpinstall.signatures.required = false,
затем about:addons -> шестерёнка -> «Установить дополнение из файла…» -> выбрать ZIP.
Проверка обновлений в Firefox скрыта: новые версии скачивайте с GitHub вручную.
