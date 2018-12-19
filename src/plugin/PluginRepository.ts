import Client from '../Client'
import Account from '../Account'
import Log from '../util/Log'
import { AbstractPlugin, IPlugin } from './AbstractPlugin'
import { EncryptionPlugin } from './EncryptionPlugin'
import PluginAPI from './PluginAPI'

export default class PluginRepository {
   private static instance: PluginRepository;

   private static registeredPlugins = [];

   private plugins: AbstractPlugin[] = [];

   private encryptionPlugins: EncryptionPlugin[] = [];

   public static add(Plugin: IPlugin) {
      if (typeof Plugin.getName !== 'function' || typeof Plugin.getName() !== 'string') {
         throw new Error('This plugin doesn\'t implement static getName():string');
      }

      let name = Plugin.getName();

      if (PluginRepository.registeredPlugins.indexOf(name) > -1) {
         throw new Error(`There is already a plugin with the name ${name}.`)
      }

      Log.debug(`Add ${name} to plugin repository`);

      PluginRepository.registeredPlugins.push(Plugin);
   }

   constructor(private account: Account) {
      let accountDisabledPlugins = account.getOption('disabledPlugins');

      this.getAllEnabledRegisteredPlugins().forEach((Plugin) => {
         if (accountDisabledPlugins.indexOf(Plugin.getName()) > -1) {
            Log.debug(`${Plugin.getName()} was disabled by the user.`);

            return;
         }

         try {
            this.instanciatePlugin(Plugin);
         } catch (err) {
            Log.warn(err);
         }
      });
   }

   public getAllRegistredPlugins() {
      return PluginRepository.registeredPlugins;
   }

   public getAllEnabledRegisteredPlugins() {
      let disabledPlugins = Client.getOption('disabledPlugins') || [];

      return this.getAllRegistredPlugins().filter(Plugin => disabledPlugins.indexOf(Plugin.getName()) < 0);
   }

   public getAllEncryptionPlugins() {
      return this.encryptionPlugins;
   }

   public getEncryptionPlugin(pluginName: string): EncryptionPlugin {
      for (let plugin of this.encryptionPlugins) {
         if ((<IPlugin> plugin.constructor).getName() === pluginName) {
            return plugin;
         }
      }

      throw new Error(`Couldn't find ${pluginName}`);
   }

   public hasEncryptionPlugin(): boolean {
      return !!this.encryptionPlugins;
   }

   private instanciatePlugin(Plugin: IPlugin) {
      let plugin;

      Log.debug('Instanciate ' + Plugin.getName() + ' for account ' + this.account.getUid())

      plugin = new Plugin(new PluginAPI(Plugin.getName(), this.account));

      if (!(plugin instanceof AbstractPlugin)) {
         throw new Error(Plugin.getName() + ' doesn\'t extend AbstractPlugin');
      }

      if (plugin instanceof EncryptionPlugin) {
         this.encryptionPlugins.push(plugin);
      } else {
         this.plugins.push(plugin);
      }
   }
}
