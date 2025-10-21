// server/plugins/weather-plugin.js
module.exports = {
  name: 'weather',
  description: 'Busca informações sobre clima',
  
  triggers: ['clima', 'tempo', 'weather', 'temperatura'],
  
  async execute(location = 'São Paulo') {
    // API gratuita: OpenWeatherMap (free tier)
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=YOUR_KEY&units=metric&lang=pt_br`
    );
    const data = await response.json();
    
    return {
      type: 'weather',
      data: {
        temp: data.main.temp,
        description: data.weather[0].description,
        humidity: data.main.humidity
      },
      speak: `A temperatura em ${location} é ${data.main.temp}°C, com ${data.weather[0].description}.`
    };
  }
};

// server/plugins/timer-plugin.js
module.exports = {
  name: 'timer',
  description: 'Define alarmes e timers',
  
  triggers: ['alarme', 'timer', 'lembrete', 'avise'],
  
  async execute(time, message) {
    // Implementa timer local
    return {
      type: 'timer_set',
      speak: `Timer configurado para ${time}.`
    };
  }
};

// server/plugin-manager.js
class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.loadPlugins();
  }

  loadPlugins() {
    const pluginFiles = ['weather-plugin', 'timer-plugin', 'news-plugin'];
    
    pluginFiles.forEach(file => {
      const plugin = require(`./plugins/${file}`);
      this.plugins.set(plugin.name, plugin);
      console.log(`🔌 Plugin carregado: ${plugin.name}`);
    });
  }

  async handleMessage(message) {
    // Detecta qual plugin usar
    for (const [name, plugin] of this.plugins) {
      const triggered = plugin.triggers.some(t => 
        message.toLowerCase().includes(t)
      );
      
      if (triggered) {
        console.log(`🔌 Executando plugin: ${name}`);
        return await plugin.execute(message);
      }
    }
    
    return null; // Nenhum plugin ativado
  }
}

module.exports = new PluginManager();