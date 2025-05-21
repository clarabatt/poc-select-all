import { render, screen, waitFor, fireEvent } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import App from './app';

describe('App component selection scenarios', () => {
    beforeEach(async () => {
        render(<App />);
        await waitFor(() => screen.getByText('Test item 1'));
    });

    test('single selection and deselection', async () => {
        const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
        const first = rowCheckboxes[0];

        await userEvent.click(first);
        expect(
            screen.getByRole('button', { name: /1 items selected/i })
        ).toBeInTheDocument();

        await userEvent.click(first);
        expect(
            screen.getByRole('button', { name: /0 items selected/i })
        ).toBeInTheDocument();
    });

    test('page selection (first 10 rows)', async () => {
        const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
        const pageCheckboxes = rowCheckboxes.slice(0, 10);
        for (const cb of pageCheckboxes) {
            await userEvent.click(cb);
        }
        expect(
            screen.getByRole('button', { name: /10 items selected/i })
        ).toBeInTheDocument();
    });

    test('page selection + single selection', async () => {
        const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
        const pageCheckboxes = rowCheckboxes.slice(0, 10);
        for (const cb of pageCheckboxes) {
            await userEvent.click(cb);
        }
        await userEvent.click(rowCheckboxes[10]);
        expect(
            screen.getByRole('button', { name: /11 items selected/i })
        ).toBeInTheDocument();
    });

    test('page selection + single deselection', async () => {
        const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
        const pageCheckboxes = rowCheckboxes.slice(0, 10);
        for (const cb of pageCheckboxes) {
            await userEvent.click(cb);
        }
        await userEvent.click(pageCheckboxes[0]);
        expect(
            screen.getByRole('button', { name: /9 items selected/i })
        ).toBeInTheDocument();
    });

    test('select all via global checkbox', async () => {
        const globalCheckbox = screen.getByTestId('global-checkbox');
        await userEvent.click(globalCheckbox);
        expect(
            screen.getByRole('button', { name: /20 items selected/i })
        ).toBeInTheDocument();
    });

    test('select all + single deselection', async () => {
        const globalCheckbox = screen.getByTestId('global-checkbox');
        await userEvent.click(globalCheckbox);
        const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
        await userEvent.click(rowCheckboxes[0]);
        expect(
            screen.getByRole('button', { name: /19 items selected/i })
        ).toBeInTheDocument();
    });
});


describe('App component with filters applied', () => {
    beforeEach(async () => {
        render(<App />);
        await waitFor(() => screen.getByText('Test item 1'));
        // Apply a status filter
        const statusSelect = screen.getAllByRole('listbox')[0];
        fireEvent.change(statusSelect, { target: { name: 'status', value: ['open'] } });
        await waitFor(() => screen.getByText('Test item 1'));
    });

    test('single selection and deselection with filters', async () => {
        const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
        const first = rowCheckboxes[0];

        await userEvent.click(first);
        expect(
            screen.getByRole('button', { name: /1 items selected/i })
        ).toBeInTheDocument();

        await userEvent.click(first);
        expect(
            screen.getByRole('button', { name: /0 items selected/i })
        ).toBeInTheDocument();
    });

    test('page selection (first 10 rows) with filters', async () => {
        const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
        const pageCheckboxes = rowCheckboxes.slice(0, 10);
        for (const cb of pageCheckboxes) {
            await userEvent.click(cb);
        }
        expect(
            screen.getByRole('button', { name: /10 items selected/i })
        ).toBeInTheDocument();
    });

    test('page selection + single selection with filters', async () => {
        const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
        const pageCheckboxes = rowCheckboxes.slice(0, 10);
        for (const cb of pageCheckboxes) {
            await userEvent.click(cb);
        }
        await userEvent.click(rowCheckboxes[10]);
        expect(
            screen.getByRole('button', { name: /11 items selected/i })
        ).toBeInTheDocument();
    });

    test('page selection + single deselection with filters', async () => {
        const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
        const pageCheckboxes = rowCheckboxes.slice(0, 10);
        for (const cb of pageCheckboxes) {
            await userEvent.click(cb);
        }
        await userEvent.click(pageCheckboxes[0]);
        expect(
            screen.getByRole('button', { name: /9 items selected/i })
        ).toBeInTheDocument();
    });

    test('select all via global checkbox with filters', async () => {
        const globalCheckbox = screen.getByTestId('global-checkbox');
        await userEvent.click(globalCheckbox);
        expect(
            screen.getByRole('button', { name: /20 items selected/i })
        ).toBeInTheDocument();
    });

    test('select all + single deselection with filters', async () => {
        const globalCheckbox = screen.getByTestId('global-checkbox');
        await userEvent.click(globalCheckbox);
        const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
        await userEvent.click(rowCheckboxes[0]);
        expect(
            screen.getByRole('button', { name: /19 items selected/i })
        ).toBeInTheDocument();
    });
});

describe('Changing filters after selection', () => {
    test('select an item, apply filter, then select all should check the global checkbox', async () => {
        render(<App />);
        await waitFor(() => screen.getByText('Test item 1'));

        // Select a single item without filters
        const rowCheckboxes = screen.getAllByRole('checkbox', { name: /select row/i });
        await userEvent.click(rowCheckboxes[0]);
        expect(
            screen.getByRole('button', { name: /1 items selected/i })
        ).toBeInTheDocument();

        // Apply a status filter
        const statusSelect = screen.getAllByRole('listbox')[0];
        fireEvent.change(statusSelect, { target: { name: 'status', value: ['open'] } });
        await waitFor(() => screen.getByText('Test item 1'));

        // Now click global select-all checkbox
        const globalCheckbox = screen.getByTestId('global-checkbox');
        await userEvent.click(globalCheckbox);

        expect(globalCheckbox).toBeChecked();
    });
});