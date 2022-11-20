# ElectronIssue
Electron downloadItem.setSavePath is not catching the download correctly

I am trying to catch a download from an iframe and promt an open or save as option for the user. Instead of the default save-dialog box for electron. I have been following the electron downloadItem documentation, and have looked at the few examples there are online, which I am following exactly.

Without line: ‘item.setSavePath(‘tmp/save.pdf’) the save-dialog opens as expected, and the downloadItem.once(‘done’) is triggered just fine.

Adding setSavePath results in no dialog box, and no file is downloaded. Which also results in no downloadItem.once('done') event.

Has anyone else experienced this issue and do you have a solution?
