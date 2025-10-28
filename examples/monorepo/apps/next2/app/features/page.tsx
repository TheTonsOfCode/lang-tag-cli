'use client';

import { Panel } from 'lib2';

export default function FeaturesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Features of Next App 2</h1>
      <p className="mb-4">
        Here we showcase some cool features, also using lib2.
      </p>
      <Panel title="Feature A">
        <p>Details about Feature A. It's awesome!</p>
      </Panel>
      <Panel title="Feature B" className="mt-4 bg-slate-50">
        <p>Details about Feature B. It's even more awesome!</p>
        <ul>
          <li>Point 1</li>
          <li>Point 2</li>
        </ul>
      </Panel>
    </div>
  );
}
