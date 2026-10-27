import { mountApplication } from './app';

const application = mountApplication(document.querySelector<HTMLDivElement>('#app')!);
if (import.meta.hot) import.meta.hot.dispose(() => application.dispose());