export interface Person {
    id: string;
    first_name: string;
    last_name: string;
    nickname?: string;
    maiden_name?: string;
    has_photo?: boolean;
    photo_coordinates?: [number, number, number, number] | null;
    photo_url?: string;
}

export interface FeedItem {
    id: string;
    type: 'post' | 'ad';
    author?: string;
    handle?: string;
    sponsor?: string;
    isoDate: string;
    displayDate: string;
    content: string;
    imageUrl?: string;
    person_id?: string;
    sourcePdf: string;
}

export interface Source {
    Publication: string;
    Date: string;
    Source_URL: string;
}

export interface MasterData {
    Feed: FeedItem[];
    People: Person[];
    Organizations: any[];
    Locations: any[];
    Sources: Source[];
}
