import React, { useState, useEffect } from 'react';
import './App.css';
import FeedItem from './components/FeedItem';
import { MasterData, FeedItem as FeedItemType } from './types';
import masterDataJson from './data/master.json';

const App: React.FC = () => {
    const [sortedFeed, setSortedFeed] = useState<FeedItemType[]>([]);

    useEffect(() => {
        const data = masterDataJson as MasterData;
        
        // 1. Separate posts and ads
        const posts = data.Feed.filter(item => item.type === 'post');
        const ads = data.Feed.filter(item => item.type === 'ad');

        // 2. Sort posts chronologically
        const sortedPosts = [...posts].sort((a, b) => 
            new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime()
        );

        // 3. Inject ads every 3rd post
        const combined: FeedItemType[] = [];
        let adIndex = 0;

        sortedPosts.forEach((post, index) => {
            combined.push(post);
            if ((index + 1) % 3 === 0 && adIndex < ads.length) {
                combined.push(ads[adIndex]);
                adIndex++;
            }
        });

        // 4. Append remaining ads if any
        while (adIndex < ads.length) {
            combined.push(ads[adIndex]);
            adIndex++;
        }

        setSortedFeed(combined);
    }, []);

    return (
        <div className="app-container">
            <header className="app-header">
                <h1>The Historical Feed</h1>
                <p>Sparta Township Archive Pipeline</p>
            </header>
            <main className="feed-container">
                {sortedFeed.map(item => (
                    <FeedItem key={item.id} item={item} />
                ))}
            </main>
        </div>
    );
};

export default App;
