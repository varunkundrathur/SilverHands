import React, { useState } from "react";
import {
  MapPin,
  Sparkles,
  Heart,
  MessageSquare,
  Repeat,
  GraduationCap,
  Volume2,
  Languages,
  CheckCircle,
  Clock,
  Share2,
  Navigation,
  ExternalLink,
  Edit,
} from "lucide-react";
import { Listing } from "../types";
import { formatDistance } from "../services/locationService";
import { AudioPlayerButton } from "./AudioPlayerButton";

interface ListingCardProps {
  listing: Listing;
  onContactProvider: (listing: Listing) => void;
  onSelectOnMap?: (listing: Listing) => void;
  onEditListing?: (listing: Listing) => void;
  isOwner?: boolean;
  largeTextMode?: boolean;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onContactProvider,
  onSelectOnMap,
  onEditListing,
  isOwner = false,
  largeTextMode = false,
}) => {
  const [showOriginalLanguage, setShowOriginalLanguage] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const displayTitle = showOriginalLanguage
    ? listing.title
    : listing.titleEnglish || listing.title;

  const displayDescription = showOriginalLanguage
    ? listing.description
    : listing.descriptionEnglish || listing.description;

  const hasTranslation =
    Boolean(listing.titleEnglish && listing.titleEnglish !== listing.title) ||
    Boolean(listing.descriptionEnglish && listing.descriptionEnglish !== listing.description);

  return (
    <div
      id={`listing-${listing.id}`}
      className="group bg-slate-900/95 border-2 border-amber-900/30 hover:border-amber-500/60 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col text-amber-50"
    >
      {/* Cinematic Photographic Hero Image */}
      <div className="relative h-64 w-full overflow-hidden bg-slate-950">
        <img
          src={listing.imageUrl}
          alt={displayTitle}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter brightness-95"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

        {/* Distance Badge (Proximity Segregation) */}
        <div className="absolute top-4 left-4 bg-slate-950/85 backdrop-blur-md border border-amber-400/40 text-amber-300 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center space-x-1.5">
          <MapPin className="w-4 h-4 text-amber-400" />
          <span>{formatDistance(listing.distanceKm)}</span>
        </div>

        {/* Action badges: Like & Edit */}
        <div className="absolute top-4 right-4 flex items-center space-x-2">
          {onEditListing && (
            <button
              onClick={() => onEditListing(listing)}
              className="p-2.5 rounded-full bg-slate-950/80 hover:bg-amber-500 text-amber-300 hover:text-slate-950 backdrop-blur-md transition-all shadow-md border border-amber-500/40 cursor-pointer flex items-center space-x-1"
              title="Edit this service listing"
            >
              <Edit className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold pr-1">Edit</span>
            </button>
          )}
          <button
            onClick={() => setIsLiked(!isLiked)}
            className={`p-2.5 rounded-full backdrop-blur-md transition-all shadow-md ${
              isLiked
                ? "bg-red-500 text-white"
                : "bg-slate-950/80 text-slate-300 hover:text-red-400"
            }`}
          >
            <Heart className="w-4 h-4 fill-current" />
          </button>
        </div>

        {/* Price / Barter Tag Floating */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div className="bg-slate-950/90 backdrop-blur-md border border-amber-500/40 px-4 py-1.5 rounded-2xl">
            {listing.price > 0 ? (
              <div className="flex items-baseline space-x-1">
                <span className="text-xl font-bold text-amber-300 font-mono">
                  ₹{listing.price.toLocaleString("en-IN")}
                </span>
                <span className="text-xs text-slate-400">/ service or item</span>
              </div>
            ) : (
              <span className="text-sm font-bold text-amber-300">Pure Barter Trade</span>
            )}
          </div>

          {/* Heritage Voice Note Quick Button on Image */}
          <AudioPlayerButton
            voiceNote={listing.voiceNote}
            fallbackText={listing.description}
            language={listing.providerLanguage}
            size="sm"
            label="Artisan Voice"
          />
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        {/* Provider Profile snippet */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <img
              src={listing.providerAvatar || listing.imageUrl}
              alt={listing.providerName}
              className="w-11 h-11 rounded-full object-cover border-2 border-amber-400/80 shadow-md"
              referrerPolicy="no-referrer"
            />
            <div>
              <h4 className="text-base font-bold text-amber-100 font-serif leading-tight">
                {listing.providerName}
              </h4>
              <div className="text-xs text-amber-300/80 font-medium">
                {listing.location.neighborhood || "Local District"} • {listing.providerLanguage || "Multilingual"}
              </div>
            </div>
          </div>

          {hasTranslation && (
            <button
              onClick={() => setShowOriginalLanguage(!showOriginalLanguage)}
              title="Toggle Native Language / English Translation"
              className="flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-medium"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{showOriginalLanguage ? "English" : listing.providerLanguage}</span>
            </button>
          )}
        </div>

        {/* Listing Title & Description */}
        <div className="space-y-2">
          <h3
            className={`font-bold text-amber-50 font-serif leading-snug ${
              largeTextMode ? "text-2xl" : "text-xl"
            }`}
          >
            {displayTitle}
          </h3>
          <p
            className={`text-slate-300 font-normal leading-relaxed ${
              largeTextMode ? "text-lg" : "text-base"
            }`}
          >
            {displayDescription}
          </p>
        </div>

        {/* Generational Heritage Notes */}
        {listing.heritageNotes && (
          <div className="p-3 bg-amber-950/30 border border-amber-600/30 rounded-2xl flex items-start space-x-2.5">
            <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/90 italic leading-relaxed">
              "{listing.heritageNotes}"
            </p>
          </div>
        )}

        {/* Badges: Digital Apprentice & Barter Details */}
        <div className="flex flex-wrap gap-2 pt-1">
          {listing.digitalApprenticeEligible && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-200 text-xs font-bold">
              <GraduationCap className="w-4 h-4 text-purple-400" />
              <span>Youth Apprentice Welcome</span>
            </div>
          )}

          {listing.isBarter && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs font-bold">
              <Repeat className="w-4 h-4 text-amber-400" />
              <span>Barter / Skill Exchange</span>
            </div>
          )}
        </div>

        {listing.isBarter && listing.barterDetails && (
          <div className="text-xs text-amber-300/80 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <span className="font-semibold text-amber-200">Willing to trade for: </span>
            {listing.barterDetails}
          </div>
        )}

        {/* Tags */}
        {listing.tags && listing.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {listing.tags.map((tag, idx) => (
              <span
                key={idx}
                className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Card Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
          {onSelectOnMap && (
            <button
              onClick={() => onSelectOnMap(listing)}
              title="Pinpoint on Real Interactive Map"
              className="px-3.5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-200 font-bold text-sm border border-slate-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>Map</span>
            </button>
          )}

          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${listing.location.lat},${listing.location.lng}&travelmode=walking`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in Google Maps Walking Navigation (Free)"
            className="px-3 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-blue-200 font-semibold text-xs border border-slate-700 transition-colors flex items-center space-x-1"
          >
            <Navigation className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Directions</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>

          <button
            onClick={() => onContactProvider(listing)}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm sm:text-base shadow-lg shadow-amber-900/30 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Connect & Message</span>
          </button>
        </div>
      </div>
    </div>
  );
};
