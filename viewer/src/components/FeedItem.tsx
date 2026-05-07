import React from 'react';
import './FeedItem.css';
import { FeedItem as FeedItemType } from '../types';

interface Props {
    item: FeedItemType;
}

const FeedItem: React.FC<Props> = ({ item }) => {
    const isAd = item.type === 'ad';
    
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getGradient = (name: string) => {
        const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const index = hash % 20;
        const gradients = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)',
            'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
            'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
            'linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%)',
            'linear-gradient(135deg, #a6c0fe 0%, #f68084 100%)',
            'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
            'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
            'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)',
            'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
            'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
            'linear-gradient(135deg, #f067b4 0%, #81ffef 100%)',
            'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
            'linear-gradient(135deg, #ff9a9e 0%, #f6d365 100%)'
        ];
        return gradients[index];
    };

    return (
        <div className={`feed-item ${item.type}`}>
            <div className="avatar-container">
                {isAd ? (
                    <div className="ad-avatar">Ad</div>
                ) : item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.author} className="avatar-img" />
                ) : (
                    <div 
                        className="avatar-gradient" 
                        style={{ background: getGradient(item.author || '') }}
                    >
                        {getInitials(item.author || '')}
                    </div>
                )}
            </div>
            <div className="content-container">
                <div className="header">
                    <span className="author">{isAd ? item.sponsor : item.author}</span>
                    {!isAd && <span className="handle">{item.handle}</span>}
                    <span className="dot">·</span>
                    <span className="date">{item.displayDate}</span>
                </div>
                <div className="body">
                    {item.content}
                </div>
                <div className="footer">
                    <a href={item.sourcePdf} target="_blank" rel="noopener noreferrer" className="source-link">
                        View Source Document
                    </a>
                </div>
            </div>
        </div>
    );
};

export default FeedItem;
