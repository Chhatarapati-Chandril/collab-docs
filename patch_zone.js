const fs = require('fs');
const file = 'client/src/app/core/services/notifications.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
    "import { Injectable, inject, signal } from '@angular/core';",
    "import { Injectable, inject, signal, NgZone } from '@angular/core';"
);

code = code.replace(
    "private socket: any = null;",
    "private socket: any = null;\n    private zone = inject(NgZone);"
);

code = code.replace(
    "this.socket.on('notification', (notif: AppNotification) => {",
    "this.socket.on('notification', (notif: AppNotification) => {\n                this.zone.run(() => {"
);

code = code.replace(
    "this.newNotification$.next(notif);\n            });",
    "this.newNotification$.next(notif);\n                });\n            });"
);

fs.writeFileSync(file, code);
