'use client';

import { Panel } from 'lib2';

export default function HomePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Welcome to Next App 2 - Home</h1>
      <p className="mb-4">This is the home page. We are using lib2 here!</p>
      <Panel title="Main Content Panel (from lib2)">
        <p>This is some content inside the panel from lib2.</p>
        <p>It helps structure content nicely.</p>
      </Panel>
    </div>
  );
}
