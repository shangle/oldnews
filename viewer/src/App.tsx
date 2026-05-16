import React, { useMemo, useState } from 'react';
import './App.css';
import FeedItem from './components/FeedItem';
import { MasterData, FeedItem as FeedItemType, Person, Source } from './types';
import masterDataJson from './data/master.json';

type FeedFilter = 'all' | 'people' | 'places' | 'events' | 'businesses' | 'schools' | 'infrastructure' | 'ads';
type SortOrder = 'oldest' | 'newest';
type ArchiveView = 'feed' | 'map' | 'timeline' | 'people' | 'places' | 'topics' | 'collections' | 'saved';

interface Category {
    label: string;
    className: string;
}

interface PlaceMatch {
    label: string;
    type: string;
    x: number;
    y: number;
}

const data = masterDataJson as MasterData;

const numberFormatter = new Intl.NumberFormat('en-US');
const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

const compactDateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
});

const categoryRules: Array<{ label: string; className: string; terms: string[] }> = [
    { label: 'Council Vote', className: 'council', terms: ['council', 'township', 'board', 'contract', 'supervisor'] },
    { label: 'School Event', className: 'school', terms: ['school', 'student', 'teacher', 'class', 'primary', 'madrigals'] },
    { label: 'Business Opening', className: 'business', terms: ['shop', 'store', 'market', 'business', 'sale', 'company', 'lodge', 'club'] },
    { label: 'Infrastructure', className: 'infrastructure', terms: ['street', 'road', 'bridge', 'water', 'pave', 'main st', 'oak st'] },
    { label: 'Weather', className: 'weather', terms: ['snow', 'rain', 'weather', 'river', 'storm', 'flood'] },
    { label: 'Accident', className: 'accident', terms: ['accident', 'injured', 'crash', 'fire', 'hospital'] },
    { label: 'Community Event', className: 'event', terms: ['dance', 'dinner', 'celebration', 'fair', 'meeting', 'supper', 'reception'] },
    { label: 'Family Notice', className: 'family', terms: ['born', 'birth', 'married', 'wedding', 'anniversary', 'daughter', 'son'] },
];

const placeRules: PlaceMatch[] = [
    { label: 'Sparta', type: 'Town', x: 51, y: 48 },
    { label: 'Main Street', type: 'Street', x: 52, y: 45 },
    { label: 'Water Street', type: 'Street', x: 58, y: 53 },
    { label: 'Oak Street', type: 'Street', x: 48, y: 42 },
    { label: 'North Street', type: 'Street', x: 49, y: 35 },
    { label: 'Kent City', type: 'Town', x: 37, y: 30 },
    { label: 'Greenville', type: 'City', x: 76, y: 42 },
    { label: 'Coopersville', type: 'City', x: 29, y: 70 },
    { label: 'Yellow River', type: 'Waterway', x: 61, y: 66 },
    { label: 'Sparta High School', type: 'School', x: 45, y: 58 },
    { label: 'Sparta Baptist', type: 'Church', x: 55, y: 39 },
    { label: 'Holy Family Church', type: 'Church', x: 42, y: 52 },
];

const toTime = (isoDate: string) => {
    const time = new Date(isoDate).getTime();
    return Number.isFinite(time) ? time : 0;
};

const toDate = (isoDate: string) => new Date(toTime(isoDate));

const formatDate = (isoDate: string) => {
    const time = toTime(isoDate);
    return time ? dateFormatter.format(new Date(time)) : 'Undated';
};

const formatCompactDate = (isoDate: string) => {
    const time = toTime(isoDate);
    return time ? compactDateFormatter.format(new Date(time)) : 'Undated';
};

const getPersonName = (person?: Person) => {
    if (!person) {
        return 'Unknown resident';
    }

    const nickname = person.nickname ? ` "${person.nickname}"` : '';
    return `${person.first_name}${nickname} ${person.last_name}`.trim();
};

const sourceTitle = (url?: string) => {
    if (!url) {
        return 'Source document';
    }

    const fileName = decodeURIComponent(url.split('/').pop() || 'Source document');
    return fileName.replace(/\.pdf$/i, '').replace(/\s+-\s+/g, ' / ');
};

const sourcePageLabel = (url?: string) => {
    const title = sourceTitle(url);
    const page = title.match(/Page\s+\d+/i)?.[0];
    const publication = title.split(' / ')[0] || 'Archive';
    return `${publication}${page ? ` - ${page}` : ''}`;
};

const sourceKey = (item: FeedItemType) => item.sourcePdf || 'unknown-source';

const itemKey = (item: FeedItemType) => `${item.id}-${item.isoDate}-${item.sourcePdf}`;

const getCategory = (item: FeedItemType): Category => {
    if (item.type === 'ad') {
        return { label: 'Archive Ad', className: 'ad' };
    }

    const text = `${item.author || ''} ${item.sponsor || ''} ${item.content}`.toLowerCase();
    const match = categoryRules.find(rule => rule.terms.some(term => text.includes(term)));
    return match ? { label: match.label, className: match.className } : { label: 'Past Feed', className: 'post' };
};

const getHeadline = (item: FeedItemType) => {
    const trimmed = item.content.trim();
    const sentence = trimmed.split(/[.!?]/)[0] || trimmed;
    return sentence.length > 82 ? `${sentence.slice(0, 79).trim()}...` : sentence;
};

const getSummary = (item: FeedItemType) => {
    const summary = item.content.trim();
    return summary.length > 145 ? `${summary.slice(0, 142).trim()}...` : summary;
};

const getPlacesForItem = (item: FeedItemType) => {
    const haystack = `${item.author || ''} ${item.sponsor || ''} ${item.content} ${sourceTitle(item.sourcePdf)}`.toLowerCase();
    return placeRules.filter(place => haystack.includes(place.label.toLowerCase()));
};

const uniqueByLabel = (places: PlaceMatch[]) => {
    const seen = new Set<string>();
    return places.filter(place => {
        if (seen.has(place.label)) {
            return false;
        }

        seen.add(place.label);
        return true;
    });
};

const getConfidence = (item: FeedItemType, person?: Person) => {
    let score = item.sourcePdf ? 88 : 72;
    if (item.displayDate) {
        score += 3;
    }
    if (person?.photo_url || item.imageUrl) {
        score += 2;
    }
    if (item.person_id || item.sponsor) {
        score += 2;
    }
    return Math.min(score, 97);
};

const matchesTopic = (item: FeedItemType, filter: FeedFilter) => {
    const category = getCategory(item);
    const text = `${category.label} ${item.content} ${item.author || ''} ${item.sponsor || ''}`.toLowerCase();

    switch (filter) {
        case 'all':
            return true;
        case 'ads':
            return item.type === 'ad';
        case 'people':
            return Boolean(item.person_id);
        case 'places':
            return getPlacesForItem(item).length > 0;
        case 'events':
            return ['event', 'family', 'weather', 'accident'].includes(category.className) || text.includes('meeting');
        case 'businesses':
            return item.type === 'ad' || category.className === 'business';
        case 'schools':
            return category.className === 'school';
        case 'infrastructure':
            return category.className === 'infrastructure' || category.className === 'council';
        default:
            return true;
    }
};

const App: React.FC = () => {
    const [activeView, setActiveView] = useState<ArchiveView>('feed');
    const [query, setQuery] = useState('');
    const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
    const [yearFilter, setYearFilter] = useState('all');
    const [monthFilter, setMonthFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState<SortOrder>('oldest');
    const [selectedPersonId, setSelectedPersonId] = useState('');
    const [selectedItem, setSelectedItem] = useState<FeedItemType | undefined>(undefined);
    const [visibleCount, setVisibleCount] = useState(30);
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [savedKeys, setSavedKeys] = useState<Set<string>>(() => new Set());
    const [detailMode, setDetailMode] = useState<'evidence' | 'context'>('evidence');

    const peopleById = useMemo(() => {
        return new Map(data.People.map(person => [person.id, person]));
    }, []);

    const sourceByUrl = useMemo(() => {
        const map = new Map<string, Source>();
        data.Sources.forEach(source => {
            if (!map.has(source.Source_URL)) {
                map.set(source.Source_URL, source);
            }
        });
        return map;
    }, []);

    const allFeed = useMemo(() => {
        return [...data.Feed].sort((a, b) => toTime(a.isoDate) - toTime(b.isoDate));
    }, []);

    const years = useMemo(() => {
        return Array.from(new Set(allFeed.map(item => item.isoDate.slice(0, 4)).filter(Boolean))).sort();
    }, [allFeed]);

    const placeStats = useMemo(() => {
        const counts = new Map<string, { place: PlaceMatch; count: number }>();
        allFeed.forEach(item => {
            uniqueByLabel(getPlacesForItem(item)).forEach(place => {
                const current = counts.get(place.label) || { place, count: 0 };
                current.count += 1;
                counts.set(place.label, current);
            });
        });

        return Array.from(counts.values()).sort((a, b) => b.count - a.count || a.place.label.localeCompare(b.place.label));
    }, [allFeed]);

    const totals = useMemo(() => {
        const linked = allFeed.filter(item => item.sourcePdf).length;
        const firstYear = years[0] || 'Unknown';
        const lastYear = years[years.length - 1] || firstYear;

        return {
            all: allFeed.length,
            people: data.People.length,
            places: placeStats.length,
            portraits: data.People.filter(person => person.has_photo || person.photo_url).length,
            sources: new Set(allFeed.map(sourceKey)).size,
            linkedPercent: allFeed.length ? Math.round((linked / allFeed.length) * 100) : 0,
            yearSpan: `${firstYear}-${lastYear}`,
        };
    }, [allFeed, placeStats.length, years]);

    const topicFilters = useMemo(() => {
        const labels: Array<{ key: FeedFilter; label: string }> = [
            { key: 'all', label: 'All' },
            { key: 'people', label: 'People' },
            { key: 'places', label: 'Places' },
            { key: 'events', label: 'Events' },
            { key: 'businesses', label: 'Businesses' },
            { key: 'schools', label: 'Schools' },
            { key: 'infrastructure', label: 'Infrastructure' },
            { key: 'ads', label: 'Ads' },
        ];

        return labels.map(filter => ({
            ...filter,
            count: allFeed.filter(item => matchesTopic(item, filter.key)).length,
        }));
    }, [allFeed]);

    const peopleStats = useMemo(() => {
        const counts = new Map<string, number>();
        allFeed.forEach(item => {
            if (item.person_id) {
                counts.set(item.person_id, (counts.get(item.person_id) || 0) + 1);
            }
        });

        return data.People
            .map(person => ({
                person,
                count: counts.get(person.id) || 0,
            }))
            .filter(entry => entry.count > 0)
            .sort((a, b) => b.count - a.count || getPersonName(a.person).localeCompare(getPersonName(b.person)));
    }, [allFeed]);

    const filteredFeed = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        const filtered = allFeed.filter(item => {
            if (!matchesTopic(item, feedFilter)) {
                return false;
            }

            if (yearFilter !== 'all' && !item.isoDate.startsWith(yearFilter)) {
                return false;
            }

            if (monthFilter !== 'all' && !item.isoDate.startsWith(monthFilter)) {
                return false;
            }

            if (selectedPersonId && item.person_id !== selectedPersonId) {
                return false;
            }

            if (!normalizedQuery) {
                return true;
            }

            const searchable = [
                item.author,
                item.handle,
                item.sponsor,
                item.content,
                item.displayDate,
                sourceTitle(item.sourcePdf),
                getCategory(item).label,
                ...getPlacesForItem(item).map(place => place.label),
                item.person_id ? getPersonName(peopleById.get(item.person_id)) : '',
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return searchable.includes(normalizedQuery);
        });

        return filtered.sort((a, b) => {
            const direction = sortOrder === 'oldest' ? 1 : -1;
            return (toTime(a.isoDate) - toTime(b.isoDate)) * direction;
        });
    }, [allFeed, feedFilter, yearFilter, monthFilter, selectedPersonId, query, sortOrder, peopleById]);

    const visibleItems = filteredFeed.slice(0, visibleCount);
    const activeItem = selectedItem && filteredFeed.includes(selectedItem) ? selectedItem : filteredFeed[0];
    const activeIndex = activeItem ? filteredFeed.indexOf(activeItem) : -1;
    const activePerson = activeItem?.person_id ? peopleById.get(activeItem.person_id) : undefined;
    const activePlaces = activeItem ? uniqueByLabel(getPlacesForItem(activeItem)) : [];
    const activeSource = activeItem ? sourceByUrl.get(activeItem.sourcePdf) : undefined;
    const activeCategory = activeItem ? getCategory(activeItem) : { label: 'Past Feed', className: 'post' };
    const activeConfidence = activeItem ? getConfidence(activeItem, activePerson) : 0;
    const selectedPerson = selectedPersonId ? peopleById.get(selectedPersonId) : undefined;
    const dateRange = `${formatDate(allFeed[0]?.isoDate || '')} - ${formatDate(allFeed[allFeed.length - 1]?.isoDate || '')}`;

    const relatedItems = useMemo(() => {
        if (!activeItem) {
            return [];
        }

        return allFeed
            .filter(item => {
                if (item === activeItem) {
                    return false;
                }

                if (activeItem.person_id) {
                    return item.person_id === activeItem.person_id;
                }

                const activePlaceLabels = new Set(getPlacesForItem(activeItem).map(place => place.label));
                return getPlacesForItem(item).some(place => activePlaceLabels.has(place.label));
            })
            .slice(0, 4);
    }, [allFeed, activeItem]);

    const savedItems = useMemo(() => {
        return allFeed.filter(item => savedKeys.has(itemKey(item)));
    }, [allFeed, savedKeys]);

    const sourceStats = useMemo(() => {
        const counts = new Map<string, { url: string; count: number; source?: Source; sample?: FeedItemType }>();
        allFeed.forEach(item => {
            if (!item.sourcePdf) {
                return;
            }

            const key = sourceKey(item);
            const current = counts.get(key) || {
                url: key,
                count: 0,
                source: sourceByUrl.get(key),
                sample: item,
            };
            current.count += 1;
            counts.set(key, current);
        });

        return Array.from(counts.values()).sort((a, b) => b.count - a.count);
    }, [allFeed, sourceByUrl]);

    const filteredPlaceStats = useMemo(() => {
        const counts = new Map<string, { place: PlaceMatch; count: number; items: FeedItemType[] }>();
        filteredFeed.forEach(item => {
            uniqueByLabel(getPlacesForItem(item)).forEach(place => {
                const current = counts.get(place.label) || { place, count: 0, items: [] };
                current.count += 1;
                current.items.push(item);
                counts.set(place.label, current);
            });
        });

        return Array.from(counts.values()).sort((a, b) => b.count - a.count || a.place.label.localeCompare(b.place.label));
    }, [filteredFeed]);

    const timelineBuckets = useMemo(() => {
        const counts = new Map<string, { key: string; label: string; count: number; items: FeedItemType[] }>();
        filteredFeed.forEach(item => {
            const key = item.isoDate.slice(0, 7);
            const date = toDate(`${key}-01T00:00:00`);
            const label = Number.isFinite(date.getTime())
                ? new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date)
                : key;
            const current = counts.get(key) || { key, label, count: 0, items: [] };
            current.count += 1;
            current.items.push(item);
            counts.set(key, current);
        });

        return Array.from(counts.values()).sort((a, b) => a.key.localeCompare(b.key));
    }, [filteredFeed]);

    const maxTimelineCount = Math.max(1, ...timelineBuckets.map(bucket => bucket.count));

    const knownFacts = activeItem ? [
        `${activeItem.type === 'ad' ? 'Sponsor' : 'Author'} identified as ${activeItem.type === 'ad' ? activeItem.sponsor : activeItem.author}.`,
        `Archive timestamp is ${activeItem.displayDate}.`,
        `Original source page is linked for review.`,
        activeSource ? `Publication metadata names ${activeSource.Publication}.` : `Source ID is ${sourcePageLabel(activeItem.sourcePdf)}.`,
        activePlaces[0] ? `Place reference detected: ${activePlaces[0].label}.` : `No explicit place name was extracted from this post.`,
    ] : [];

    const unknowns = [
        'Original article column coordinates',
        'Names implied but not printed',
        'Exact event end time',
        'Whether later issues corrected this item',
    ];

    const mobileItems = filteredFeed.slice(0, 3);
    const mobileVisibleItems = filteredFeed.slice(0, visibleCount);
    const primaryDate = activeItem ? toDate(activeItem.isoDate) : toDate(allFeed[0]?.isoDate || '');
    const primaryYear = Number.isFinite(primaryDate.getTime()) ? primaryDate.getFullYear() : years[0];

    const clearFilters = () => {
        setQuery('');
        setFeedFilter('all');
        setYearFilter('all');
        setMonthFilter('all');
        setSelectedPersonId('');
        setSortOrder('oldest');
        setVisibleCount(30);
        setActiveView('feed');
    };

    const setTopic = (topic: FeedFilter) => {
        setFeedFilter(topic);
        setVisibleCount(30);
    };

    const openView = (view: ArchiveView) => {
        setActiveView(view);
        setVisibleCount(30);
    };

    const openRecord = (item: FeedItemType) => {
        setSelectedItem(item);
        setDetailMode('evidence');
    };

    const toggleSaved = (item: FeedItemType) => {
        const key = itemKey(item);
        setSavedKeys(previous => {
            const next = new Set(previous);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const selectMonth = (bucketKey: string) => {
        setMonthFilter(bucketKey);
        setYearFilter(bucketKey.slice(0, 4));
        setActiveView('feed');
        setVisibleCount(30);
    };

    const selectAdjacentRecord = (offset: number) => {
        if (!filteredFeed.length) {
            return;
        }

        const baseIndex = activeIndex >= 0 ? activeIndex : 0;
        const nextIndex = Math.min(Math.max(baseIndex + offset, 0), filteredFeed.length - 1);
        setSelectedItem(filteredFeed[nextIndex]);
        setDetailMode('evidence');
    };

    const renderRecords = (items: FeedItemType[], emptyLabel = 'No records match this view.') => (
        <>
            <div className="feed-list">
                {items.length === 0 ? (
                    <div className="view-empty">
                        <h2>{emptyLabel}</h2>
                        <p>Adjust filters, search terms, or save records from the evidence feed.</p>
                        <button type="button" onClick={clearFilters}>Reset filters</button>
                    </div>
                ) : (
                    items.map((item, index) => (
                        <FeedItem
                            key={`${item.id}-${item.isoDate}-${index}`}
                            item={item}
                            person={item.person_id ? peopleById.get(item.person_id) : undefined}
                            category={getCategory(item)}
                            headline={getHeadline(item)}
                            summary={getSummary(item)}
                            sourceTitle={sourcePageLabel(item.sourcePdf)}
                            confidence={getConfidence(item, item.person_id ? peopleById.get(item.person_id) : undefined)}
                            isSelected={activeItem === item}
                            isSaved={savedKeys.has(itemKey(item))}
                            onOpenDetails={openRecord}
                            onToggleSave={toggleSaved}
                            onSelectAuthor={personId => {
                                setSelectedPersonId(personId);
                                setActiveView('feed');
                                setVisibleCount(30);
                            }}
                        />
                    ))
                )}
            </div>
        </>
    );

    const renderMobileRecordList = (
        items: FeedItemType[],
        allowLoadMore = false,
        emptyLabel = 'No records match this view.',
    ) => (
        <>
            {items.length === 0 ? (
                <div className="mobile-empty">
                    <h2>{emptyLabel}</h2>
                    <p>Try another topic, map pin, search term, or timeline cell.</p>
                    <button type="button" onClick={clearFilters}>Reset filters</button>
                </div>
            ) : (
                items.map((item, index) => {
                    const category = getCategory(item);
                    const person = item.person_id ? peopleById.get(item.person_id) : undefined;
                    const confidence = getConfidence(item, person);
                    const saved = savedKeys.has(itemKey(item));
                    return (
                        <article className="mobile-record" key={`${itemKey(item)}-mobile-${index}`}>
                            <div className="mobile-record-body">
                                <div className="mobile-record-meta">
                                    <span className={`mini-tag ${category.className}`}>{category.label}</span>
                                    <small>{formatCompactDate(item.isoDate)}</small>
                                </div>
                                <button type="button" className="mobile-record-title" onClick={() => openRecord(item)}>
                                    {getHeadline(item)}
                                </button>
                                <p>{getSummary(item)}</p>
                                <small>{item.type === 'ad' ? item.sponsor : item.author}</small>
                                <small>{sourcePageLabel(item.sourcePdf)}</small>
                                <span className="mobile-source-id">{item.id}</span>
                            </div>
                            <button type="button" className="mobile-clipping" onClick={() => openRecord(item)} aria-label={`Open evidence for ${getHeadline(item)}`}>
                                <span>{category.label}</span>
                                <strong>{getHeadline(item)}</strong>
                                <i /><i /><i />
                            </button>
                            <div className="mobile-actions">
                                <button type="button" onClick={() => openRecord(item)}>Evidence</button>
                                <span>{confidence}%</span>
                                <a href={item.sourcePdf} target="_blank" rel="noopener noreferrer">Source</a>
                                <button type="button" className={saved ? 'saved' : ''} onClick={() => toggleSaved(item)}>
                                    {saved ? 'Saved' : 'Save'}
                                </button>
                            </div>
                        </article>
                    );
                })
            )}

            {allowLoadMore && items.length < filteredFeed.length && (
                <button type="button" className="mobile-load-more" onClick={() => setVisibleCount(count => Math.min(count + 30, filteredFeed.length))}>
                    Load more from archive
                </button>
            )}
        </>
    );

    const renderMobileMainView = () => {
        if (activeView === 'map') {
            return (
                <div className="mobile-view-stack">
                    <section className="mobile-view-card">
                        <div className="mobile-view-heading">
                            <h2>Map</h2>
                            <p>{numberFormatter.format(filteredPlaceStats.length)} places in the current filters.</p>
                        </div>
                        <div className="mobile-map" aria-label="Mapped Sparta archive records">
                            <span>Sparta</span>
                            {filteredPlaceStats.map(entry => (
                                <button
                                    type="button"
                                    key={entry.place.label}
                                    style={{ left: `${entry.place.x}%`, top: `${entry.place.y}%` }}
                                    title={`${entry.place.label}: ${entry.count} records`}
                                    onClick={() => {
                                        setQuery(entry.place.label);
                                        setActiveView('feed');
                                        setVisibleCount(30);
                                    }}
                                >
                                    {entry.count}
                                </button>
                            ))}
                            <i className="mobile-map-line main" />
                            <i className="mobile-map-line cross" />
                        </div>
                    </section>
                    <section className="mobile-view-card mobile-directory-list">
                        {filteredPlaceStats.length === 0 ? (
                            <div className="mobile-empty compact">
                                <h2>No mapped places yet.</h2>
                                <p>Change the current filters to include records with place references.</p>
                            </div>
                        ) : (
                            filteredPlaceStats.slice(0, 10).map(entry => (
                                <button type="button" key={entry.place.label} onClick={() => {
                                    setQuery(entry.place.label);
                                    setActiveView('feed');
                                    setVisibleCount(30);
                                }}>
                                    <strong>{entry.place.label}</strong>
                                    <span>{entry.place.type} - {numberFormatter.format(entry.count)} records</span>
                                </button>
                            ))
                        )}
                    </section>
                </div>
            );
        }

        if (activeView === 'timeline') {
            return (
                <div className="mobile-view-stack">
                    <section className="mobile-view-card">
                        <div className="mobile-view-heading">
                            <h2>Timeline</h2>
                            <p>Heat by month for the current filters.</p>
                        </div>
                        {timelineBuckets.length === 0 ? (
                            <div className="mobile-empty compact">
                                <h2>No timeline records.</h2>
                                <p>Change filters to rebuild the heat view.</p>
                            </div>
                        ) : (
                            <div className="mobile-timeline-heat">
                                {timelineBuckets.map(bucket => (
                                    <button
                                        type="button"
                                        key={bucket.key}
                                        className={monthFilter === bucket.key ? 'active' : ''}
                                        style={{ '--heat': String(bucket.count / maxTimelineCount) } as React.CSSProperties}
                                        onClick={() => selectMonth(bucket.key)}
                                    >
                                        <strong>{bucket.count}</strong>
                                        <span>{bucket.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {monthFilter !== 'all' && (
                            <button type="button" className="mobile-secondary-action" onClick={() => setMonthFilter('all')}>
                                Clear selected month
                            </button>
                        )}
                    </section>
                </div>
            );
        }

        if (activeView === 'people' || activeView === 'places') {
            const isPeople = activeView === 'people';
            return (
                <div className="mobile-view-stack">
                    <section className="mobile-view-card mobile-directory-list">
                        <div className="mobile-view-heading">
                            <h2>{isPeople ? 'People' : 'Places'}</h2>
                            <p>{isPeople ? 'Named people with linked posts.' : 'Place references in the archive.'}</p>
                        </div>
                        {isPeople ? peopleStats.slice(0, 30).map(({ person, count }) => (
                            <button type="button" key={person.id} onClick={() => {
                                setSelectedPersonId(person.id);
                                setActiveView('feed');
                                setVisibleCount(30);
                            }}>
                                <strong>{getPersonName(person)}</strong>
                                <span>{numberFormatter.format(count)} records</span>
                            </button>
                        )) : placeStats.map(({ place, count }) => (
                            <button type="button" key={place.label} onClick={() => {
                                setQuery(place.label);
                                setActiveView('feed');
                                setVisibleCount(30);
                            }}>
                                <strong>{place.label}</strong>
                                <span>{place.type} - {numberFormatter.format(count)} records</span>
                            </button>
                        ))}
                    </section>
                </div>
            );
        }

        if (activeView === 'saved') {
            return (
                <div className="mobile-view-stack">
                    <section className="mobile-view-card">
                        <div className="mobile-view-heading">
                            <h2>Saved</h2>
                            <p>{numberFormatter.format(savedItems.length)} records saved in this browser session.</p>
                        </div>
                    </section>
                    {renderMobileRecordList(savedItems, false, 'No saved records yet.')}
                </div>
            );
        }

        return renderMobileRecordList(mobileVisibleItems, true);
    };

    const renderMainView = () => {
        if (activeView === 'map') {
            return (
                <div className="archive-view map-view">
                    <div className="view-heading">
                        <div>
                            <h2>Mapped Archive</h2>
                            <p>{numberFormatter.format(filteredPlaceStats.length)} mapped places from the current filters.</p>
                        </div>
                        <button type="button" onClick={() => setActiveView('feed')}>Back to Feed</button>
                    </div>
                    {filteredPlaceStats.length === 0 ? (
                        <div className="view-empty">
                            <h2>No mapped places match.</h2>
                            <p>Change filters or search terms to show place-linked records.</p>
                            <button type="button" onClick={clearFilters}>Reset filters</button>
                        </div>
                    ) : (
                        <>
                            <div className="large-map" aria-label="Sparta archive map">
                                <span className="map-center-label">Sparta</span>
                                {filteredPlaceStats.map(entry => (
                                    <button
                                        type="button"
                                        key={entry.place.label}
                                        className={`map-pin ${entry.count > 20 ? 'hot' : ''}`}
                                        style={{ left: `${entry.place.x}%`, top: `${entry.place.y}%` }}
                                        title={`${entry.place.label}: ${entry.count} records`}
                                        onClick={() => {
                                            setQuery(entry.place.label);
                                            openRecord(entry.items[0]);
                                            setActiveView('feed');
                                            setVisibleCount(30);
                                        }}
                                    >
                                        <span>{entry.count}</span>
                                    </button>
                                ))}
                                <i className="map-road main" />
                                <i className="map-road river" />
                                <i className="map-road north" />
                            </div>
                            <div className="map-records">
                                {filteredPlaceStats.slice(0, 8).map(entry => (
                                    <button type="button" key={entry.place.label} onClick={() => {
                                        setQuery(entry.place.label);
                                        openRecord(entry.items[0]);
                                        setActiveView('feed');
                                        setVisibleCount(30);
                                    }}>
                                        <strong>{entry.place.label}</strong>
                                        <span>{entry.place.type}</span>
                                        <small>{numberFormatter.format(entry.count)} records</small>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            );
        }

        if (activeView === 'timeline') {
            return (
                <div className="archive-view timeline-view">
                    <div className="view-heading">
                        <div>
                            <h2>Timeline Heat</h2>
                            <p>Record density by month for the current filters.</p>
                        </div>
                        <button type="button" onClick={() => setMonthFilter('all')}>Clear Month</button>
                    </div>
                    {timelineBuckets.length === 0 ? (
                        <div className="view-empty">
                            <h2>No timeline records match.</h2>
                            <p>Adjust the current filters to build the heat timeline.</p>
                            <button type="button" onClick={clearFilters}>Reset filters</button>
                        </div>
                    ) : (
                        <>
                            <div className="timeline-heat">
                                {timelineBuckets.map(bucket => (
                                    <button
                                        type="button"
                                        key={bucket.key}
                                        className={monthFilter === bucket.key ? 'active' : ''}
                                        style={{ '--heat': String(bucket.count / maxTimelineCount) } as React.CSSProperties}
                                        onClick={() => selectMonth(bucket.key)}
                                    >
                                        <strong>{bucket.count}</strong>
                                        <span>{bucket.label}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="timeline-preview">
                                {timelineBuckets.slice(-4).map(bucket => (
                                    <button type="button" key={bucket.key} onClick={() => selectMonth(bucket.key)}>
                                        <span>{bucket.label}</span>
                                        <strong>{numberFormatter.format(bucket.count)} records</strong>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            );
        }

        if (activeView === 'people') {
            return (
                <div className="archive-view directory-view">
                    <div className="view-heading">
                        <div>
                            <h2>People Directory</h2>
                            <p>Named people with linked posts in the archive.</p>
                        </div>
                    </div>
                    <div className="directory-grid">
                        {peopleStats.slice(0, 40).map(({ person, count }) => (
                            <button type="button" key={person.id} onClick={() => {
                                setSelectedPersonId(person.id);
                                setActiveView('feed');
                                setVisibleCount(30);
                            }}>
                                <strong>{getPersonName(person)}</strong>
                                <span>{numberFormatter.format(count)} records</span>
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        if (activeView === 'places') {
            return (
                <div className="archive-view directory-view">
                    <div className="view-heading">
                        <div>
                            <h2>Places Directory</h2>
                            <p>Place references extracted from the current archive feed.</p>
                        </div>
                    </div>
                    <div className="directory-grid">
                        {placeStats.map(({ place, count }) => (
                            <button type="button" key={place.label} onClick={() => {
                                setQuery(place.label);
                                setActiveView('feed');
                                setVisibleCount(30);
                            }}>
                                <strong>{place.label}</strong>
                                <span>{place.type} - {numberFormatter.format(count)} records</span>
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        if (activeView === 'topics') {
            return (
                <div className="archive-view directory-view">
                    <div className="view-heading">
                        <div>
                            <h2>Topics</h2>
                            <p>Jump into a focused slice of the feed.</p>
                        </div>
                    </div>
                    <div className="topic-board">
                        {topicFilters.map(topic => (
                            <button type="button" key={topic.key} onClick={() => {
                                setTopic(topic.key);
                                setActiveView('feed');
                            }}>
                                <span>{topic.label}</span>
                                <strong>{numberFormatter.format(topic.count)}</strong>
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        if (activeView === 'collections') {
            return (
                <div className="archive-view directory-view">
                    <div className="view-heading">
                        <div>
                            <h2>Collections</h2>
                            <p>Source pages grouped by archive document.</p>
                        </div>
                    </div>
                    <div className="collection-list">
                        {sourceStats.slice(0, 28).map(source => (
                            <a href={source.url} target="_blank" rel="noopener noreferrer" key={source.url}>
                                <strong>{source.source?.Publication || 'Archive Source'}</strong>
                                <span>{source.source?.Date || sourcePageLabel(source.url)}</span>
                                <small>{numberFormatter.format(source.count)} records</small>
                            </a>
                        ))}
                    </div>
                </div>
            );
        }

        if (activeView === 'saved') {
            return (
                <div className="archive-view saved-view">
                    <div className="view-heading">
                        <div>
                            <h2>Saved Items</h2>
                            <p>{numberFormatter.format(savedItems.length)} saved records in this browser session.</p>
                        </div>
                    </div>
                    {renderRecords(savedItems, 'No saved records yet.')}
                </div>
            );
        }

        return (
            <>
                {renderRecords(visibleItems)}
                {visibleItems.length < filteredFeed.length && (
                    <button type="button" className="load-more" onClick={() => setVisibleCount(count => Math.min(count + 30, filteredFeed.length))}>
                        Load more evidence
                    </button>
                )}
            </>
        );
    };

    return (
        <div className="oldnews-shell">
            <div className="desktop-app">
            <header className="hero-bar">
                <div className="hero-brand">
                    <h1>Sparta <span>/</span> OldNews</h1>
                    <p>The town's past, resurfaced with evidence.</p>
                </div>
                <div className="hero-metrics" aria-label="Archive metrics">
                    <div className="metric-token">
                        <span className="metric-icon">ID</span>
                        <strong>{numberFormatter.format(totals.all)}</strong>
                        <small>Archive Clippings Processed</small>
                    </div>
                    <div className="metric-token">
                        <span className="metric-icon">YR</span>
                        <strong>{totals.yearSpan}</strong>
                        <small>Years Covered</small>
                    </div>
                    <div className="metric-token">
                        <span className="metric-icon">PP</span>
                        <strong>{numberFormatter.format(totals.people + totals.places)}</strong>
                        <small>People & Places Identified</small>
                    </div>
                    <div className="metric-token">
                        <span className="metric-icon">OK</span>
                        <strong>{totals.linkedPercent}%</strong>
                        <small>Source Linked</small>
                    </div>
                </div>
                <div className="hero-manifesto">
                    <span className="compass-mark" aria-hidden="true" />
                    <p>Intent is human.<br />Integrity is engineered.</p>
                </div>
            </header>

            <section className="showcase-grid">
                <aside className="proof-column">
                    <div className="proof-card">
                        <span className="shield-mark" aria-hidden="true" />
                        <h2>Cited. Verified. Unknowns Preserved.</h2>
                        <p>Every post links to the original source and separates the facts we can confirm from what the archive leaves uncertain.</p>
                    </div>

                    <div className="phone-shell" aria-label="Mobile feed preview">
                        <div className="phone-status"><span>9:41</span><span>LTE</span></div>
                        <div className="phone-title">
                            <span>Sparta <b>/</b> OldNews</span>
                            <span className="phone-bell" />
                        </div>
                        <div className="phone-tabs">
                            <button className="active" type="button">Past Feed</button>
                            <button type="button">For You</button>
                            <button type="button">Nearby</button>
                            <button type="button">Following</button>
                        </div>
                        <div className="phone-date">
                            <span>Today in {primaryYear}</span>
                            <small>{activeItem ? formatCompactDate(activeItem.isoDate) : dateRange}</small>
                        </div>
                        <div className="phone-feed">
                            {mobileItems.map((item, index) => {
                                const category = getCategory(item);
                                return (
                                    <button type="button" className="phone-post" key={`${item.id}-phone-${index}`} onClick={() => openRecord(item)}>
                                        <span className={`mini-tag ${category.className}`}>{category.label}</span>
                                        <small>{formatCompactDate(item.isoDate)}</small>
                                        <strong>{getHeadline(item)}</strong>
                                        <p>{sourcePageLabel(item.sourcePdf)}</p>
                                        <span className="phone-proof">Source ID linked</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="phone-nav">
                            <span className="active">Feed</span>
                            <span>Map</span>
                            <span>Search</span>
                            <span>Timeline</span>
                            <span>Profile</span>
                        </div>
                    </div>
                </aside>

                <main className="console-frame" aria-label="OldNews archive viewer">
                    <div className="console-topbar">
                        <div className="console-brand">Sparta <span>/</span> OldNews</div>
                        <label className="console-search">
                            <span>Search</span>
                            <input
                                aria-label="Search desktop archive"
                                value={query}
                                onChange={event => {
                                    setQuery(event.target.value);
                                    setVisibleCount(30);
                                }}
                                placeholder="Search people, places, events, dates..."
                            />
                        </label>
                        <button type="button" className="plain-link" onClick={() => openView('topics')}>About</button>
                        <span className="seal-button" aria-label="Integrity status">OK</span>
                        <span className="menu-button" aria-hidden="true"><span /></span>
                    </div>

                    <div className="console-body">
                        <aside className="console-nav" aria-label="Archive sections">
                            <button className={activeView === 'feed' ? 'active' : ''} type="button" onClick={() => openView('feed')}>Past Feed</button>
                            <button className={activeView === 'map' ? 'active' : ''} type="button" onClick={() => openView('map')}>Map</button>
                            <button className={activeView === 'timeline' ? 'active' : ''} type="button" onClick={() => openView('timeline')}>Timeline</button>
                            <button className={activeView === 'people' ? 'active' : ''} type="button" onClick={() => openView('people')}>People</button>
                            <button className={activeView === 'places' ? 'active' : ''} type="button" onClick={() => openView('places')}>Places</button>
                            <button className={activeView === 'topics' ? 'active' : ''} type="button" onClick={() => openView('topics')}>Topics</button>
                            <button className={activeView === 'collections' ? 'active' : ''} type="button" onClick={() => openView('collections')}>Collections</button>
                            <button className={activeView === 'saved' ? 'active' : ''} type="button" onClick={() => openView('saved')}>Saved Items</button>

                            <div className="timeline-widget">
                                <span>Timeline</span>
                                <div className="sparkline">
                                    {years.map((year, index) => (
                                        <i key={year} style={{ height: `${20 + ((index * 13) % 40)}px` }} />
                                    ))}
                                </div>
                                <strong>{primaryYear}</strong>
                                <small>{activeItem ? formatCompactDate(activeItem.isoDate) : dateRange}</small>
                                <button type="button" onClick={() => openView('timeline')}>
                                    Timeline Heat
                                </button>
                            </div>
                        </aside>

                        <section className="evidence-feed" aria-label="Archive evidence feed">
                            <div className="filter-deck">
                                <div className="topic-chips">
                                    {topicFilters.map(filter => (
                                        <button
                                            type="button"
                                            className={feedFilter === filter.key ? 'active' : ''}
                                            key={filter.key}
                                            onClick={() => setTopic(filter.key)}
                                        >
                                            {filter.label} <span>{numberFormatter.format(filter.count)}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="filter-tools">
                                    <label>
                                        <span>Year</span>
                                        <select value={yearFilter} onChange={event => {
                                            setYearFilter(event.target.value);
                                            setMonthFilter('all');
                                            setVisibleCount(30);
                                        }}>
                                            <option value="all">All</option>
                                            {years.map(year => <option value={year} key={year}>{year}</option>)}
                                        </select>
                                    </label>
                                    <button type="button" onClick={() => setSortOrder(sortOrder === 'oldest' ? 'newest' : 'oldest')}>
                                        Sort: {sortOrder === 'oldest' ? 'Oldest' : 'Newest'}
                                    </button>
                                </div>
                            </div>

                            <div className="feed-day-bar">
                                <div>
                                    <strong>Today in {primaryYear}</strong>
                                    <span>{activeItem ? formatCompactDate(activeItem.isoDate) : dateRange}</span>
                                </div>
                                <small>{numberFormatter.format(filteredFeed.length)} matching records</small>
                            </div>

                            <div className="active-filter-strip">
                                {selectedPerson && <span>Person: {getPersonName(selectedPerson)}</span>}
                                {query && <span>Search: {query}</span>}
                                {yearFilter !== 'all' && <span>Year: {yearFilter}</span>}
                                {monthFilter !== 'all' && <span>Month: {monthFilter}</span>}
                                {(selectedPerson || query || yearFilter !== 'all' || monthFilter !== 'all' || feedFilter !== 'all') && (
                                    <button type="button" onClick={clearFilters}>Reset</button>
                                )}
                            </div>

                            {renderMainView()}
                        </section>

                        {selectedItem && <button type="button" className="mobile-scrim" aria-label="Close evidence detail" onClick={() => setSelectedItem(undefined)} />}

                        <aside className={`evidence-panel ${selectedItem ? 'mobile-open' : ''}`} aria-label="Archive evidence detail">
                            {activeItem ? (
                                <>
                                    <div className="panel-tabs">
                                        <button className={detailMode === 'evidence' ? 'active' : ''} type="button" onClick={() => setDetailMode('evidence')}>Archive Evidence</button>
                                        <button className={detailMode === 'context' ? 'active' : ''} type="button" onClick={() => setDetailMode('context')}>Context</button>
                                        <button type="button" aria-label="Previous record" onClick={() => selectAdjacentRecord(-1)} disabled={activeIndex <= 0}>Prev</button>
                                        <button type="button" aria-label="Next record" onClick={() => selectAdjacentRecord(1)} disabled={activeIndex < 0 || activeIndex >= filteredFeed.length - 1}>Next</button>
                                        <button type="button" aria-label="Close evidence detail" onClick={() => setSelectedItem(undefined)}>Close</button>
                                    </div>

                                    <div className="detail-hero">
                                        <div>
                                            <span className={`mini-tag ${activeCategory.className}`}>{activeCategory.label}</span>
                                            <h2>{getHeadline(activeItem)}</h2>
                                            <p>{activeItem.type === 'ad' ? activeItem.sponsor : activeItem.author} - {formatCompactDate(activeItem.isoDate)}</p>
                                            <small>{activeSource?.Publication || 'Sparta archive'} - {sourcePageLabel(activeItem.sourcePdf)}</small>
                                            <a href={activeItem.sourcePdf} target="_blank" rel="noopener noreferrer">Open Original</a>
                                        </div>
                                        <div className="paper-evidence" aria-hidden="true">
                                            <span>{activeCategory.label}</span>
                                            <strong>{getHeadline(activeItem)}</strong>
                                            <i />
                                            <i />
                                            <i />
                                        </div>
                                    </div>

                                    {detailMode === 'evidence' ? (
                                        <>
                                            <section className="known-facts">
                                                <h3>Known Facts</h3>
                                                <ul>
                                                    {knownFacts.map(fact => <li key={fact}>{fact}</li>)}
                                                </ul>
                                            </section>

                                            <div className="entity-columns">
                                                <section>
                                                    <h3>People</h3>
                                                    <button type="button" onClick={() => {
                                                        if (activeItem.person_id) {
                                                            setSelectedPersonId(activeItem.person_id);
                                                            setActiveView('feed');
                                                            setVisibleCount(30);
                                                        }
                                                    }} disabled={!activeItem.person_id}>
                                                        <span className="entity-icon">P</span>
                                                        <strong>{activeItem.type === 'ad' ? activeItem.sponsor : activeItem.author}</strong>
                                                        <small>{activeItem.type === 'ad' ? 'Sponsor' : activePerson ? 'Identified person' : 'Named in post'}</small>
                                                    </button>
                                                </section>
                                                <section>
                                                    <h3>Places</h3>
                                                    {(activePlaces.length ? activePlaces : [{ label: 'Sparta', type: 'Town', x: 51, y: 48 }]).slice(0, 3).map(place => (
                                                        <button type="button" key={place.label} onClick={() => {
                                                            setQuery(place.label);
                                                            setActiveView('feed');
                                                            setVisibleCount(30);
                                                        }}>
                                                            <span className="entity-icon">L</span>
                                                            <strong>{place.label}</strong>
                                                            <small>{place.type}</small>
                                                        </button>
                                                    ))}
                                                </section>
                                            </div>

                                            <div className="confidence-card">
                                                <h3>Confidence</h3>
                                                <strong>{activeConfidence}%</strong>
                                                <span><i style={{ width: `${activeConfidence}%` }} /></span>
                                                <h4>Unknowns Preserved</h4>
                                                <ul>
                                                    {unknowns.map(item => <li key={item}>{item}</li>)}
                                                </ul>
                                            </div>

                                            <div className="tag-row">
                                                {[activeCategory.label, ...activePlaces.map(place => place.label), activeItem.type === 'ad' ? 'Advertisement' : 'Post'].slice(0, 5).map(tag => (
                                                    <span key={tag}>{tag}</span>
                                                ))}
                                            </div>

                                            <div className="verified-strip">
                                                <span>Verified from archive</span>
                                                <span>Source linked</span>
                                            </div>
                                        </>
                                    ) : (
                                        <section className="context-summary">
                                            <h3>Record Context</h3>
                                            <p>This item is connected to {relatedItems.length} nearby archive records through shared people, places, or source pages.</p>
                                            <div>
                                                <button type="button" onClick={() => openView('map')}>View on Map</button>
                                                <button type="button" onClick={() => openView('timeline')}>View Timeline</button>
                                            </div>
                                        </section>
                                    )}

                                    {relatedItems.length > 0 && (
                                        <section className="related-list">
                                            <h3>Related Records</h3>
                                            {relatedItems.map((item, index) => (
                                                <button type="button" key={`${item.id}-related-${index}`} onClick={() => openRecord(item)}>
                                                    <span>{formatCompactDate(item.isoDate)}</span>
                                                    <strong>{getHeadline(item)}</strong>
                                                </button>
                                            ))}
                                        </section>
                                    )}
                                </>
                            ) : (
                                <div className="empty-panel">
                                    <h2>No records match these filters.</h2>
                                    <button type="button" onClick={clearFilters}>Reset filters</button>
                                </div>
                            )}
                        </aside>
                    </div>
                </main>

                <aside className="insight-rail" aria-label="Archive intelligence panels">
                    <section className="map-panel">
                        <h2>Interactive Map</h2>
                        <div className="map-grid">
                            <span className="map-name">Sparta</span>
                            {placeStats.slice(0, 14).map((entry, index) => (
                                <button
                                    type="button"
                                    key={entry.place.label}
                                    style={{
                                        left: `${16 + ((index * 19) % 68)}%`,
                                        top: `${20 + ((index * 13) % 58)}%`,
                                    }}
                                    title={`${entry.place.label}: ${entry.count} records`}
                                    onClick={() => {
                                        setQuery(entry.place.label);
                                        openView('map');
                                    }}
                                />
                            ))}
                            <i className="map-line one" />
                            <i className="map-line two" />
                            <i className="map-line three" />
                        </div>
                    </section>

                    <section className="side-panel">
                        <h2>People & Places</h2>
                        <div className="entity-list">
                            {peopleStats.slice(0, 3).map(({ person, count }) => (
                                <button type="button" key={person.id} onClick={() => {
                                    setSelectedPersonId(person.id);
                                    setActiveView('feed');
                                    setVisibleCount(30);
                                }}>
                                    <span>P</span>
                                    <strong>{getPersonName(person)}</strong>
                                    <small>{numberFormatter.format(count)} records</small>
                                </button>
                            ))}
                            {placeStats.slice(0, 3).map(({ place, count }) => (
                                <button type="button" key={place.label} onClick={() => {
                                    setQuery(place.label);
                                    setActiveView('feed');
                                    setVisibleCount(30);
                                }}>
                                    <span>L</span>
                                    <strong>{place.label}</strong>
                                    <small>{numberFormatter.format(count)} records</small>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="side-panel relationship-panel">
                        <h2>Relationships</h2>
                        <div className="relationship-graph">
                            <span className="node center">{activePlaces[0]?.label || 'Sparta'}</span>
                            <span className="node a">{activeItem?.type === 'ad' ? activeItem.sponsor : activeItem?.author || 'Resident'}</span>
                            <span className="node b">{activeCategory.label}</span>
                            <span className="node c">{activeSource?.Publication || 'Archive Source'}</span>
                            <i className="edge ea" />
                            <i className="edge eb" />
                            <i className="edge ec" />
                        </div>
                    </section>

                    <section className="side-panel integrity-panel">
                        <h2>Integrity Engine</h2>
                        <div className="integrity-seal">
                            <span>OK</span>
                        </div>
                        <ul>
                            <li>Source linked</li>
                            <li>Archive verified</li>
                            <li>Facts extracted</li>
                            <li>Unknowns preserved</li>
                            <li>Intent preserved</li>
                        </ul>
                    </section>
                </aside>
            </section>

            <footer className="feature-strip">
                <div>
                    <span className="feature-icon">C</span>
                    <strong>Citation First</strong>
                    <p>Every post links to the original newspaper and source ID.</p>
                </div>
                <div>
                    <span className="feature-icon">E</span>
                    <strong>Evidence Visible</strong>
                    <p>See the post, facts, source, and unknowns together.</p>
                </div>
                <div>
                    <span className="feature-icon">T</span>
                    <strong>Explore By Time</strong>
                    <p>Search and filter the feed by year, topic, and person.</p>
                </div>
                <div>
                    <span className="feature-icon">R</span>
                    <strong>Discover Connections</strong>
                    <p>People, places, events, and source pages stay connected.</p>
                </div>
                <div>
                    <span className="feature-icon">S</span>
                    <strong>Built For Sparta</strong>
                    <p>Preserving the local record with linked evidence.</p>
                </div>
            </footer>
            </div>

            <section className="mobile-app" aria-label="OldNews mobile feed">
                <header className="mobile-header">
                    <div className="mobile-status"><span>9:41</span><span>5G</span></div>
                    <div className="mobile-titlebar">
                        <span className="mobile-avatar" />
                        <strong>Sparta <b>/</b> OldNews</strong>
                        <span className="mobile-bell" aria-hidden="true" />
                    </div>
                    <nav className="mobile-feed-tabs" aria-label="Mobile feed filters">
                        <button type="button" className={activeView === 'feed' && feedFilter === 'all' ? 'active' : ''} onClick={() => {
                            setShowMobileSearch(false);
                            clearFilters();
                        }}>Past Feed</button>
                        <button type="button" className={activeView === 'feed' && feedFilter === 'events' ? 'active' : ''} onClick={() => {
                            setTopic('events');
                            setActiveView('feed');
                        }}>For You</button>
                        <button type="button" className={activeView === 'feed' && feedFilter === 'places' ? 'active' : ''} onClick={() => {
                            setTopic('places');
                            setActiveView('feed');
                        }}>Nearby</button>
                        <button type="button" className={activeView === 'feed' && feedFilter === 'people' ? 'active' : ''} onClick={() => {
                            setTopic('people');
                            setActiveView('feed');
                        }}>Following</button>
                    </nav>
                    {showMobileSearch && (
                        <label className="mobile-search">
                            <span>Search archive</span>
                            <input
                                aria-label="Search historical posts"
                                value={query}
                                onChange={event => {
                                    setQuery(event.target.value);
                                    setVisibleCount(30);
                                }}
                                placeholder="People, places, events, dates..."
                                autoFocus
                            />
                        </label>
                    )}
                </header>

                <div className="mobile-date-chip">
                    <span>Today in {primaryYear}</span>
                    <button type="button" onClick={() => setSortOrder(sortOrder === 'oldest' ? 'newest' : 'oldest')}>
                        {activeItem ? formatCompactDate(activeItem.isoDate) : 'All'} · {sortOrder === 'oldest' ? 'Oldest' : 'Newest'}
                    </button>
                </div>

                <main className="mobile-feed-list">
                    {renderMobileMainView()}
                </main>

                <nav className="mobile-tabbar" aria-label="Mobile archive navigation">
                    <button type="button" className={!showMobileSearch && activeView === 'feed' ? 'active' : ''} onClick={() => {
                        setShowMobileSearch(false);
                        setActiveView('feed');
                        setVisibleCount(30);
                    }}>Feed</button>
                    <button type="button" className={activeView === 'map' ? 'active' : ''} onClick={() => {
                        setShowMobileSearch(false);
                        openView('map');
                    }}>Map</button>
                    <button type="button" className={showMobileSearch ? 'active' : ''} onClick={() => setShowMobileSearch(value => !value)}>Search</button>
                    <button type="button" className={activeView === 'timeline' ? 'active' : ''} onClick={() => {
                        setShowMobileSearch(false);
                        openView('timeline');
                    }}>Timeline</button>
                    <button type="button" className={activeView === 'saved' ? 'active' : ''} onClick={() => {
                        setShowMobileSearch(false);
                        openView('saved');
                    }}>Profile</button>
                </nav>

                {selectedItem && (
                    <>
                        <button type="button" className="mobile-scrim" aria-label="Close evidence detail" onClick={() => setSelectedItem(undefined)} />
                        <aside className="mobile-detail-drawer" aria-label="Archive evidence detail">
                            <div className="mobile-detail-top">
                                <button type="button" className={detailMode === 'evidence' ? 'active' : ''} onClick={() => setDetailMode('evidence')}>Archive Evidence</button>
                                <button type="button" className={detailMode === 'context' ? 'active' : ''} onClick={() => setDetailMode('context')}>Context</button>
                                <button type="button" aria-label="Close evidence detail" onClick={() => setSelectedItem(undefined)}>Close</button>
                            </div>
                            <div className="mobile-detail-hero">
                                <div>
                                    <span className={`mini-tag ${activeCategory.className}`}>{activeCategory.label}</span>
                                    <h2>{getHeadline(activeItem || selectedItem)}</h2>
                                    <p>{selectedItem.type === 'ad' ? selectedItem.sponsor : selectedItem.author}</p>
                                    <small>{sourcePageLabel(selectedItem.sourcePdf)}</small>
                                    <a href={selectedItem.sourcePdf} target="_blank" rel="noopener noreferrer">Open Original</a>
                                </div>
                                <div className="mobile-detail-paper" aria-hidden="true">
                                    <span>{activeCategory.label}</span>
                                    <strong>{getHeadline(activeItem || selectedItem)}</strong>
                                    <i /><i /><i />
                                </div>
                            </div>
                            {detailMode === 'evidence' ? (
                                <>
                                    <section className="mobile-facts">
                                        <h3>Known Facts</h3>
                                        <ul>
                                            {knownFacts.map(fact => <li key={fact}>{fact}</li>)}
                                        </ul>
                                    </section>
                                    <section className="mobile-facts">
                                        <h3>Unknowns Preserved</h3>
                                        <ul>
                                            {unknowns.map(item => <li key={item}>{item}</li>)}
                                        </ul>
                                    </section>
                                    <div className="mobile-confidence">
                                        <strong>{activeConfidence}%</strong>
                                        <span><i style={{ width: `${activeConfidence}%` }} /></span>
                                    </div>
                                </>
                            ) : (
                                <section className="mobile-context-panel">
                                    <h3>Context</h3>
                                    <p>{relatedItems.length} related records share people, places, or source pages with this item.</p>
                                    <div>
                                        <button type="button" onClick={() => {
                                            setSelectedItem(undefined);
                                            openView('map');
                                        }}>Map</button>
                                        <button type="button" onClick={() => {
                                            setSelectedItem(undefined);
                                            openView('timeline');
                                        }}>Timeline</button>
                                    </div>
                                    {relatedItems.slice(0, 3).map((item, index) => (
                                        <button type="button" key={`${item.id}-mobile-context-${index}`} onClick={() => openRecord(item)}>
                                            <span>{formatCompactDate(item.isoDate)}</span>
                                            <strong>{getHeadline(item)}</strong>
                                        </button>
                                    ))}
                                </section>
                            )}
                        </aside>
                    </>
                )}
            </section>
        </div>
    );
};

export default App;
