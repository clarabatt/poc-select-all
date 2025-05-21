import { h } from 'preact';
import { vi } from 'vitest';
import '@testing-library/jest-dom';

vi.mock('**/*.css', () => ({}), { virtual: true });

global.fetch = vi.fn((url, options) => {
    const mockItems = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `Test item ${i + 1}`,
        status: 'open',
        color: 'red',
        assignee: 'Alice',
    }));

    // GET /api/items…
    if (url.startsWith('/api/items?') && (!options || options.method === 'GET')) {
        return Promise.resolve({
            ok: true,
            json: () =>
                Promise.resolve({
                    items: mockItems,
                    totalRecords: mockItems.length,
                }),
        });
    }

    // POST /api/items/selection
    if (url === '/api/items/selection' && options?.method === 'POST') {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ items: [] }),
        });
    }

    // fallback
    return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({}),
    });
});

beforeEach(() => {
    vi.clearAllMocks();
});

// ——— Stub out PrimeReact components ———
vi.mock('primereact/datatable', () => ({
    DataTable: ({ value, selection = [], onSelectionChange }) =>
        h(
            'ul',
            {},
            value.map(item =>
                h(
                    'li',
                    { key: item.id },
                    [
                        h('input', {
                            type: 'checkbox',
                            'aria-label': 'select row',
                            checked: selection.some(r => r.id === item.id),
                            onChange: () => {
                                const isSelected = selection.some(r => r.id === item.id);
                                const newSelection = isSelected
                                    ? selection.filter(r => r.id !== item.id)
                                    : [...selection, item];
                                onSelectionChange({ value: newSelection });
                            }
                        }),
                        item.name
                    ]
                )
            )
        )
}));
vi.mock('primereact/column', () => ({ Column: () => null }));
vi.mock('primereact/checkbox', () => ({ Checkbox: props => h('input', { type: 'checkbox', ...props }) }));
vi.mock('primereact/button', () => ({ Button: ({ label, ...props }) => h('button', props, label) }));
vi.mock('primereact/multiselect', () => ({ MultiSelect: props => h('select', { multiple: true, ...props }) }));
vi.mock('primereact/panel', () => ({ Panel: ({ children }) => h('div', {}, children) }));
vi.mock('primereact/tag', () => ({ Tag: ({ value }) => h('span', {}, value) }));
