import { useMemo } from 'react';
import type { DataSourceResponse } from '../../types/api';
import './ChatWelcome.css';

interface ChatWelcomeProps {
    datasource: DataSourceResponse | null;
    onPromptClick: (prompt: string) => void;
    userName?: string;
}

interface SamplePrompt {
    icon: string;
    text: string;
    category: 'overview' | 'analysis' | 'comparison' | 'trend';
}

export function ChatWelcome({ datasource, onPromptClick, userName }: ChatWelcomeProps) {
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    }, []);

    const samplePrompts = useMemo((): SamplePrompt[] => {
        if (!datasource?.metadata_json?.columns) {
            return getDefaultPrompts();
        }

        const columns = datasource.metadata_json.columns;
        const datasetName = datasource.name;

        // Categorize columns by type
        const numericColumns = columns.filter(col =>
            ['INTEGER', 'BIGINT', 'DOUBLE', 'FLOAT', 'DECIMAL', 'NUMBER', 'INT', 'REAL'].includes(col.type.toUpperCase())
        );
        const textColumns = columns.filter(col =>
            ['VARCHAR', 'STRING', 'TEXT', 'CHAR'].includes(col.type.toUpperCase())
        );
        const dateColumns = columns.filter(col =>
            ['DATE', 'DATETIME', 'TIMESTAMP', 'TIME'].includes(col.type.toUpperCase())
        );

        const prompts: SamplePrompt[] = [];

        // Overview prompt - always include
        prompts.push({
            icon: '📊',
            text: `Give me an overview of ${datasetName}`,
            category: 'overview'
        });

        // Analysis prompts based on numeric columns
        if (numericColumns.length > 0) {
            const numCol = numericColumns[0].name;
            prompts.push({
                icon: '📈',
                text: `What is the average ${formatColumnName(numCol)}?`,
                category: 'analysis'
            });

            if (numericColumns.length > 1) {
                const numCol2 = numericColumns[1].name;
                prompts.push({
                    icon: '🔍',
                    text: `Show me the top 10 records by ${formatColumnName(numCol2)}`,
                    category: 'analysis'
                });
            }
        }

        // Comparison prompts based on text columns (categorical)
        if (textColumns.length > 0 && numericColumns.length > 0) {
            const catCol = textColumns[0].name;
            const numCol = numericColumns[0].name;
            prompts.push({
                icon: '📉',
                text: `Compare ${formatColumnName(numCol)} by ${formatColumnName(catCol)}`,
                category: 'comparison'
            });
        }

        // Trend prompts if we have date columns
        if (dateColumns.length > 0 && numericColumns.length > 0) {
            const dateCol = dateColumns[0].name;
            const numCol = numericColumns[0].name;
            prompts.push({
                icon: '📆',
                text: `Show ${formatColumnName(numCol)} trend over ${formatColumnName(dateCol)}`,
                category: 'trend'
            });
        }

        // Add distribution prompt if we have numeric data
        if (numericColumns.length > 0) {
            const numCol = numericColumns[0].name;
            prompts.push({
                icon: '🎯',
                text: `What is the distribution of ${formatColumnName(numCol)}?`,
                category: 'analysis'
            });
        }

        // Limit to 4 prompts for clean UI
        return prompts.slice(0, 4);
    }, [datasource]);

    return (
        <div className="chat-welcome">
            <div className="chat-welcome-header">
                <div className="chat-welcome-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                    </svg>
                </div>
                <h2 className="chat-welcome-title">
                    {greeting}{userName ? `, ${userName.split(' ')[0]}` : ''}!
                </h2>
                <p className="chat-welcome-subtitle">
                    I'm your AI data assistant. How can I help you explore your data today?
                </p>
            </div>

            {datasource && (
                <div className="chat-welcome-dataset">
                    <span className="dataset-label">Analyzing:</span>
                    <span className="dataset-name">{datasource.name}</span>
                    {datasource.metadata_json?.row_count && (
                        <span className="dataset-info">
                            ({datasource.metadata_json.row_count.toLocaleString()} rows)
                        </span>
                    )}
                </div>
            )}

            <div className="chat-welcome-prompts">
                <p className="prompts-label">The following are sample prompts. Try asking as:</p>
                <div className="prompts-grid">
                    {samplePrompts.map((prompt, index) => (
                        <button
                            key={index}
                            className="prompt-suggestion"
                            onClick={() => onPromptClick(prompt.text)}
                        >
                            <span className="prompt-icon">{prompt.icon}</span>
                            <span className="prompt-text">{prompt.text}</span>
                            <svg className="prompt-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Helper function to format column names for display
function formatColumnName(name: string): string {
    return name
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
}

// Default prompts when no dataset info is available
function getDefaultPrompts(): SamplePrompt[] {
    return [
        { icon: '📊', text: 'Give me an overview of the data', category: 'overview' },
        { icon: '📈', text: 'Show me the key metrics', category: 'analysis' },
        { icon: '🔍', text: 'What are the top 10 records?', category: 'analysis' },
        { icon: '📉', text: 'Show me data distribution', category: 'comparison' }
    ];
}
