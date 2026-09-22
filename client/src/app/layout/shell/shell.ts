import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../../shared/navbar/navbar';

@Component({
    selector: 'app-shell',
    standalone: true,
    imports: [RouterOutlet, Navbar],
    templateUrl: './shell.html',
    styleUrl: './shell.scss',
})
export class Shell {}
