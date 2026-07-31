"""
scene/views.py — Complex scene NLG fallback endpoint.

POST /api/scene-narrate/
Request body:
  {
    "detections": [
      { "label": "person", "position": "left", "depth": "close", "confidence": 0.87 },
      ...
    ]
  }

Response:
  { "sentence": "You are in a busy scene — a person on your left, close, ..." }

Only called by the frontend when more than 5 simultaneous new detections
are found — for the common case (1–5 objects), the frontend uses its own
local template engine without any network call.
"""

import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST


# ── Article helper ─────────────────────────────────────────────────────────────

VOWELS = set('aeiou')

def article(word: str) -> str:
    return 'an' if word and word[0].lower() in VOWELS else 'a'


# ── Position phrasing ──────────────────────────────────────────────────────────

def position_phrase(position: str) -> str:
    if position == 'centre':
        return 'ahead'
    return f'on your {position}'


# ── NLG template ──────────────────────────────────────────────────────────────

def build_sentence(detections: list[dict]) -> str:
    """Build a rich summary sentence for a complex scene."""
    if not detections:
        return 'No objects detected.'

    # Sort by confidence descending, take top 8 to keep audio concise
    sorted_dets = sorted(detections, key=lambda d: d.get('confidence', 0), reverse=True)[:8]

    parts = []
    for d in sorted_dets:
        label = str(d.get('label', 'object') or 'object')
        position = str(d.get('position', 'centre') or 'centre')
        depth = str(d.get('depth', '') or '')
        art = article(label)
        pos = position_phrase(position)
        depth_str = f', {depth}' if depth else ''
        parts.append(f'{art} {label} {pos}{depth_str}')

    if len(parts) == 1:
        return f'You are in a scene with {parts[0]}.'

    body = ', '.join(parts[:-1]) + f', and {parts[-1]}'
    return f'You are in a busy scene — {body}.'


# ── View ──────────────────────────────────────────────────────────────────────

@csrf_exempt
@require_POST
def scene_narrate(request):
    """
    POST /api/scene-narrate/
    Accepts a JSON list of detections, returns a rich NLG sentence.
    """
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    if not isinstance(body, dict):
        return JsonResponse({'error': 'Invalid JSON structure, expected an object'}, status=400)

    detections = body.get('detections', [])
    if not isinstance(detections, list):
        return JsonResponse({'error': 'detections must be a list'}, status=400)

    # Ensure all detections are dictionaries
    if not all(isinstance(d, dict) for d in detections):
        return JsonResponse({'error': 'each detection must be a dictionary'}, status=400)

    sentence = build_sentence(detections)
    return JsonResponse({'sentence': sentence})
