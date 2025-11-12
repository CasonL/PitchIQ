/**
 * MarcusDemoCard.tsx
 * Dashboard card that launches Marcus demo
 */

import React from 'react';
import { Card, CardContent, CardActions, Button, Chip } from '@mui/material';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MarcusDemoCard: React.FC = () => {
  const navigate = useNavigate();

  const handleStartDemo = () => {
    navigate('/demo/marcus');
  };

  return (
    <Card 
      sx={{ 
        background: 'linear-gradient(135deg, #fee2e2 0%, #fef3c7 100%)',
        border: '2px solid #dc2626',
        boxShadow: '0 10px 40px rgba(220, 38, 38, 0.2)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 15px 50px rgba(220, 38, 38, 0.3)',
        }
      }}
    >
      <CardContent sx={{ pb: 2 }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="text-red-600" size={24} />
            <h3 className="text-xl font-bold text-gray-900">
              Meet Marcus Stindle
            </h3>
          </div>
          <Chip 
            label="PREMIUM" 
            size="small"
            sx={{ 
              bgcolor: '#dc2626', 
              color: 'white',
              fontWeight: 'bold',
              fontSize: '0.7rem'
            }}
          />
        </div>

        {/* Description */}
        <p className="text-gray-700 mb-4 leading-relaxed">
          Experience world-class sales technique in action. Marcus demonstrates 
          perfect selling while you pitch to him. In 4 minutes, you'll experience 
          what mastery feels like.
        </p>

        {/* Quick highlights */}
        <ul className="space-y-2 text-sm text-gray-700 mb-4">
          <li className="flex items-start">
            <span className="text-red-600 mr-2 font-bold">✓</span>
            Natural coaching embedded in conversation
          </li>
          <li className="flex items-start">
            <span className="text-red-600 mr-2 font-bold">✓</span>
            Models detachment and confidence
          </li>
          <li className="flex items-start">
            <span className="text-red-600 mr-2 font-bold">✓</span>
            Aspiration over instruction
          </li>
        </ul>

        {/* Teaser */}
        <div className="bg-white/60 rounded-lg p-3 border border-red-200">
          <p className="text-sm text-gray-600 italic">
            "You'll want to BE him, not just learn from him."
          </p>
        </div>
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button
          fullWidth
          variant="contained"
          onClick={handleStartDemo}
          endIcon={<ArrowRight />}
          sx={{
            bgcolor: '#dc2626',
            '&:hover': {
              bgcolor: '#b91c1c',
            },
            fontWeight: 'bold',
            py: 1.5,
            fontSize: '1rem',
            textTransform: 'none',
            boxShadow: '0 4px 15px rgba(220, 38, 38, 0.4)',
          }}
        >
          Start Marcus Demo
        </Button>
      </CardActions>
    </Card>
  );
};

export default MarcusDemoCard;
