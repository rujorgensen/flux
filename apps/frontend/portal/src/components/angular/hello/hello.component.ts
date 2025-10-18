import { inject, Component, input, Input, signal, type OnInit } from '@angular/core';
import { provideHttpClient, HttpClient, withFetch } from '@angular/common/http';

interface Todo {
    id: number;
    title: string;
    completed: boolean;
}

@Component({
    selector: 'app-hello',
    template: `
    <p>Hello from Angular!!</p>

    @if (show()) {
      <p>{{ helpText() }}</p>

        <ul>
      @for (todo of todos(); track todo.id) {
        <li>
          {{ todo.title }}
        </li>
      }
    </ul>
    }

    <button (click)="toggle()">Toggle</button>
  `,
})
export class HelloComponent implements OnInit {
    helpText = input('help');

    show = signal(false);

    toggle() {
        this.show.update((show) => !show);
    }

    static clientProviders = [provideHttpClient(
        withFetch()
    )];
    static renderProviders = [HelloComponent.clientProviders];

    http = inject(HttpClient);
    todos = signal<Todo[]>([]);

    ngOnInit() {
        this.http
            .get<Todo[]>('https://jsonplaceholder.typicode.com/todos')
            .subscribe((todos) => this.todos.set(todos));
    }
}