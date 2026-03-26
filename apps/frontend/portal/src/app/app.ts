import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgxSonnerToaster } from 'ngx-sonner';

@Component({
    imports: [
        RouterModule,
        NgxSonnerToaster,
    ],
    selector: 'prtl-root',
    templateUrl: './app.html',
    styleUrl: './app.scss',
})
export class App { }
