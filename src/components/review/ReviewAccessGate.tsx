import React from 'react';
import { EyeOff, AlertCircle, Clock, FileQuestion } from 'lucide-react';

interface ReviewAccessGateProps {
  status: 'not_found' | 'revoked' | 'expired' | 'no_version';
  errorMessage?: string;
}

export const ReviewAccessGate: React.FC<ReviewAccessGateProps> = ({
  status,
  errorMessage,
}) => {
  const getIcon = () => {
    switch (status) {
      case 'expired':
        return <Clock className="w-6 h-6 text-amber-400" />;
      case 'no_version':
        return <FileQuestion className="w-6 h-6 text-blue-400" />;
      case 'revoked':
        return <AlertCircle className="w-6 h-6 text-red-400" />;
      case 'not_found':
      default:
        return <EyeOff className="w-6 h-6 text-slate-400" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'expired':
        return 'Review Link Expired';
      case 'no_version':
        return 'Review Package In Preparation';
      case 'revoked':
        return 'Review Link Inactive';
      case 'not_found':
      default:
        return 'Review Room Unavailable';
    }
  };

  const getDescription = () => {
    if (errorMessage) return errorMessage;
    switch (status) {
      case 'expired':
        return 'This campaign review link has reached its expiration date. Please request a fresh review link from your campaign sponsor.';
      case 'no_version':
        return 'The campaign owner has not published a review package snapshot yet. Please check back shortly.';
      case 'revoked':
        return 'This review link has been revoked or replaced with a newer version. Please contact your campaign sponsor for an updated link.';
      case 'not_found':
      default:
        return 'This review link does not exist, has expired, or has been revoked. Please check the URL or contact your campaign sponsor.';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 text-center">
        <div className="w-14 h-14 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto">
          {getIcon()}
        </div>
        <div>
          <h1 className="text-xl font-serif font-bold text-white">{getTitle()}</h1>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">{getDescription()}</p>
        </div>
      </div>
    </div>
  );
};
