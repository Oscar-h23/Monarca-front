import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { asset } from '../../core/utils/assets';
@Component({standalone:true,imports:[CommonModule],templateUrl:'./about.html'})
export class AboutPage{
  banner=asset('Nosotros_img/portada_nosotros.png');
  model=asset('Nosotros_img/modelo.png');
  mission=asset('mision.jpg');
  vision=asset('vision.jpg');
  teamImage=asset('Nosotros_img/Juntos.jpg');
  team=[
    {name:'Josue Gonzales',role:'Coordinación y desarrollo JavaScript',image:asset('Nosotros_img/josue.jpeg')},
    {name:'Luz Grandez',role:'HTML y experiencia visual',image:asset('Nosotros_img/Luz.png')},
    {name:'Diego Alexander Chavez Villegas',role:'Maquetación y revisión de contenido',image:asset('Nosotros_img/Juntos.jpg')},
    {name:'Ian Arturo Callirgos Huamán',role:'CSS y diseño adaptable',image:asset('Nosotros_img/Juntos.jpg')},
    {name:'Jordy Espinoza',role:'CSS y diseño adaptable',image:asset('Nosotros_img/Juntos.jpg')}
  ];
  values=['Centrado en las personas','Orientación al cliente','Desarrollo sostenible','Innovación','Integridad'];
}
