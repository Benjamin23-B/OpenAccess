from django.urls import path
from . import views

urlpatterns = [
    path('scene-narrate/', views.scene_narrate, name='scene-narrate'),
]
