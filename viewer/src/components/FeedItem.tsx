import React from 'react';
import './FeedItem.css';
import { FeedItem as FeedItemType, Person } from '../types';

interface Category {
    label: string;
    className: string;
}

interface Props {
    item: FeedItemType;
    person?: Person;
    category: Category;
    headline: string;
    summary: string;
    sourceTitle: string;
    confidence: number;
    isSelected?: boolean;
    isSaved?: boolean;
    onOpenDetails: (item: FeedItemType) => void;
    onSelectAuthor: (personId: string) => void;
    onToggleSave: (item: FeedItemType) => void;
}

const resolveAssetUrl = (url?: string) => {
    if (!url) {
        return '';
    }

    if (/^https?:\/\//i.test(url)) {
        return url;
    }

    const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
    const path = url.replace(/^\/oldnews/i, '');
    return `${publicUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

const FeedItem: React.FC<Props> = ({
    item,
    person,
    category,
    headline,
    summary,
    sourceTitle,
    confidence,
    isSelected = false,
    isSaved = false,
    onOpenDetails,
    onSelectAuthor,
    onToggleSave,
}) => {
    const isAd = item.type === 'ad';
    const displayName = isAd ? item.sponsor || 'Advertisement' : item.author || 'Unknown resident';
    const imageUrl = resolveAssetUrl(item.imageUrl || person?.photo_url);

    return (
        <article className={`feed-item ${isSelected ? 'selected' : ''}`}>
            <div className="record-main">
                <div className="record-meta">
                    <span className={`mini-tag ${category.className}`}>{category.label}</span>
                    <span>{item.displayDate}</span>
                </div>

                <button
                    className="record-title"
                    type="button"
                    onClick={() => onOpenDetails(item)}
                >
                    {headline}
                </button>

                <p>{summary}</p>

                <div className="record-source">
                    <span>{displayName}</span>
                    <span>{sourceTitle}</span>
                    <span>{item.id}</span>
                </div>

                <div className="record-actions">
                    <button type="button" onClick={() => onOpenDetails(item)}>Evidence</button>
                    <a href={item.sourcePdf} target="_blank" rel="noopener noreferrer">Open Original</a>
                    {item.person_id && (
                        <button type="button" onClick={() => onSelectAuthor(item.person_id || '')}>
                            Person
                        </button>
                    )}
                    <button type="button" className={isSaved ? 'saved' : ''} onClick={() => onToggleSave(item)}>
                        {isSaved ? 'Saved' : 'Save'}
                    </button>
                </div>
            </div>

            <button className="clipping-thumb" type="button" onClick={() => onOpenDetails(item)} aria-label={`Open evidence for ${headline}`}>
                {imageUrl ? <img src={imageUrl} alt={displayName} /> : null}
                <span>{category.label}</span>
                <strong>{headline}</strong>
                <i />
                <i />
                <i />
            </button>

            <div className="record-proof" aria-label={`Confidence ${confidence}%`}>
                <span>{confidence}%</span>
            </div>
        </article>
    );
};

export default FeedItem;
