import React from 'react';
import {entryFieldsByGroup} from '../data/entryFields';

type Props = {
  group?: string;
};

export default function EntryFieldTable({group}: Props) {
  const fields = group
    ? entryFieldsByGroup(group)
    : Object.values(entryFieldsByGroup).flat();
  return (
    <table>
      <thead>
        <tr>
          <th>Key</th>
          <th>Label</th>
          <th>Control</th>
          <th>Default</th>
          <th>Risk</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {fields.map((f) => (
          <tr key={f.key}>
            <td>
              <code>{f.key}</code>
            </td>
            <td>{f.label}</td>
            <td>{f.control}</td>
            <td>{f.defaultValue ?? '—'}</td>
            <td>{f.risk}</td>
            <td>{f.shortDescription}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
