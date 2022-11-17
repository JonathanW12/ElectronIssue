const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fileManagement = require('./fileManagement')

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

app.commandLine.appendSwitch("disable-http-cache"); //disable caching (js/cs/fonts etc). 

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 1000,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: false,
      enableRemoteModule: true,
      contextIsolation: true,
      preload: path.resolve(app.getAppPath(), 'src/preload.js')
    }
  });
  
  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname + "/vuebuild", 'index.html'));
  
  //mainWindow.loadFile(path.join(__dirname, 'index.html'));
  // Open the DevTools.
  
  mainWindow.webContents.openDevTools();
  mainWindow.maximize();
  mainWindow.show();

  mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
    //Handling downloads. Promts an open or save option
    item.setSavePath('/tmp/save.pdf');
    const options = {
      type: 'info',
      buttons: ['Åbn fil','Gem','Anuller'],
      message: 'Vil du åbne eller gemme denne fil?'
    }
    item.once('done',(event,state)=>{
      if(state === 'completed') {
        dialog.showMessageBox(options).then(async (returnValue) => {
          if (returnValue.response === 0) {
            //Handle automatically opening the file
            shell.openPath(item.getSavePath());
          }
          if (returnValue.response === 1) {
            //TODO Handle prompting a save as dialog for the user
          }
          //TODO Handle canceling the file
      })
      }else{
        console.log('Download failed');
      }
    });
  })

  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    if (canceled) {
      return
    } else {
      return filePaths[0]
    }
  })
  //Electron bugfix: The code below is used when some javascript inside an iframe needs to call a webservice that uses a Session ID cookie.
  //Electron wont automatically set the Session ID cookie, so below we set it manuelle for requests going to the urls specified in 'onBeforeSendHeaders'
  let sessionIDHeader;
  const webRequest = mainWindow.webContents.session.webRequest;
  webRequest.onHeadersReceived({
      //URL TIL IFRAME
      urls: [
            'http://...*',
            'http://...g*',
          ]
    },
    (details, callback) => {
      if(details.responseHeaders['Set-Cookie']){
        if(details.responseHeaders['Set-Cookie'].length > 0){
          sessionIDHeader = details.responseHeaders['Set-Cookie'][0]
        }
      }
      callback({cancel: false, responseHeaders: details.responseHeaders});
    }
  );
  webRequest.onBeforeSendHeaders(
    {
      //URL til webserivces inde i iframen
      urls: [
            'http://.../*',
            'http://.../*'
            ]
    },
    (details, callback) => {
      var blockingResponse = {};
      details.requestHeaders['Cookie'] = sessionIDHeader;
      blockingResponse.requestHeaders = details.requestHeaders;
      callback({cancel: false, requestHeaders: blockingResponse.requestHeaders });
    },
    ['requestHeaders','blocking', 'extraHeaders']
  );

};



// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

const electron = require('electron');
let downloadInProgress = false;

const startAutoUpdater = (squirrelUrl) => {
    // The Squirrel application will watch the provided URL
    electron.autoUpdater.setFeedURL(`${squirrelUrl}`);

    //Emitted when there is an available update. The update is downloaded automatically.
    electron.autoUpdater.on('update-available', () => {
      downloadInProgress = true;
    });

    // Display a success message on successful update
    electron.autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
        const dialogOpts = {
            type: 'info',
            buttons: ['Genstart', 'Udskyd'],
            title: 'Ny version',
            message: process.platform === 'win32' ? releaseNotes : releaseName,
            detail:
                'Der er en ny version af klienten. Genstart klienten for at opdater. Hvis du udskyder, opdateres klienten næste gang du lukker og åbner klienten. ',
        }

        dialog.showMessageBox(dialogOpts).then((returnValue) => {
            if (returnValue.response === 0){
              setImmediate(() => {
                electron.autoUpdater.quitAndInstall();
              })
            }

            downloadInProgress = false;
        })
    })

    // tell squirrel to check for updates every minute
    setInterval(() => {
      if(!downloadInProgress){
        electron.autoUpdater.checkForUpdates();
      }
    }, 5000)
}

ipcMain.handle('checkForUpdates', async (event, arg) => {
   // Add this condition to avoid error when running your application locally
  if (process.env.NODE_ENV !== "dev") startAutoUpdater(arg)
})

ipcMain.handle('getAppVersion', async () => {
  return app.getVersion();
})

ipcMain.handle('getAppPath', async () => {
  return app.getPath("userData");
})
