import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgxSonnerToaster } from 'ngx-sonner';

@Component({
    imports: [
        RouterModule,
        NgxSonnerToaster,
    ],
    selector: 'prtl-root',
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
})
export class App { }
